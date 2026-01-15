import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, IonList, IonListHeader,
  IonItem, IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton,
  IonAvatar, IonAlert, IonBackButton, IonButtons, IonFooter
} from '@ionic/angular/standalone';
import { ElectionsService } from '../../../core/services/elections.service';
import { VotingService } from '../../../core/services/voting.service';
import { ElectionDto, CandidateDto, ElectionPositionDto } from '../../../core/models/elections.models';
import { firstValueFrom } from 'rxjs';

// Interface to hold candidates grouped by position
interface GroupedPosition extends ElectionPositionDto {
  candidates: CandidateDto[];
}

@Component({
  selector: 'app-voting-detail-page',
  templateUrl: './voting-detail.page.html',
  styleUrls: ['./voting-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, IonList,
    IonListHeader, IonItem, IonLabel, IonCard, IonCardHeader, IonCardTitle,
    IonCardContent, IonButton, IonAvatar, IonAlert, IonBackButton, IonButtons, IonFooter
  ],
})
export class VotingDetailPage implements OnInit {
  election = signal<ElectionDto | null>(null);
  positions = signal<GroupedPosition[]>([]);
  status = signal<'loading' | 'loaded' | 'error'>('loading');

  // Map<positionId, candidateId>
  selections = signal<Map<string, string>>(new Map());

  isAlertOpen = signal(false);
  alertHeader = signal('');
  alertMessage = signal('');
  
  private electionId: string;

  // Computed signal to determine if the submit button should be enabled
  canSubmit = computed(() => {
    if (this.status() !== 'loaded' || !this.election()) return false;
    return this.selections().size === this.positions().length;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private electionsService: ElectionsService,
    private votingService: VotingService,
  ) {
    this.electionId = this.route.snapshot.paramMap.get('id')!;
  }

  ngOnInit(): void {
    this.loadElectionDetails();
  }

  async loadElectionDetails() {
    this.status.set('loading');
    try {
      const electionData = await firstValueFrom(this.electionsService.get(this.electionId));
      this.election.set(electionData);
      
      // Group candidates by position
      const grouped = new Map<string, GroupedPosition>();
      electionData.positions.forEach(pos => {
        grouped.set(pos.id, { ...pos, candidates: [] });
      });

      electionData.candidateLists?.forEach(list => {
        const party = list.politicalParty; // Get the political party from the list
        list.candidates.forEach(candidate => {
          if (grouped.has(candidate.positionId)) {
            // Create a new candidate object with the politicalParty property
            const candidateWithParty: CandidateDto = {
              ...candidate,
              politicalParty: party,
            };
            grouped.get(candidate.positionId)!.candidates.push(candidateWithParty);
          }
        });
      });

      this.positions.set(Array.from(grouped.values()).sort((a, b) => a.order - b.order));
      this.status.set('loaded');
    } catch (error) {
      this.status.set('error');
    }
  }

  makeSelection(positionId: string, candidateId: string) {
    this.selections.update(currentMap => {
      const newMap = new Map(currentMap);
      newMap.set(positionId, candidateId);
      return newMap;
    });
  }

  isSelected(positionId: string, candidateId: string): boolean {
    return this.selections().get(positionId) === candidateId;
  }

  submitVotes() {
    this.alertHeader.set('Confirmar Votos');
    this.alertMessage.set('¿Estás seguro de que quieres emitir tu voto con estas selecciones? Esta acción no se puede deshacer.');
    this.isAlertOpen.set(true);
  }

  async confirmAndSubmit() {
    if (!this.canSubmit()) return;

    const selectionsDto = Array.from(this.selections().entries()).map(([positionId, candidateId]) => ({
      electionPositionId: positionId,
      candidateId: candidateId,
    }));

    try {
      await firstValueFrom(this.votingService.bulkVote(this.electionId, selectionsDto));
      this.alertHeader.set('Voto Emitido');
      this.alertMessage.set('Gracias por participar. Tu voto ha sido registrado correctamente.');
      // The alert is already open, just content will update. The dismiss handler will navigate away.
    } catch (error: any) {
      const errorMessage = error.error?.message || 'No se pudo registrar tu voto.';
      this.alertHeader.set('Error');
      this.alertMessage.set(errorMessage);
    }
  }

  handleAlertDismiss() {
    const wasSuccess = this.alertHeader() === 'Voto Emitido';
    this.isAlertOpen.set(false);
    if (wasSuccess) {
      this.router.navigate(['/admin/voting']);
    }
  }

  get alertButtons() {
    if (this.alertHeader() === 'Confirmar Votos') {
      return [
        { text: 'Cancelar', role: 'cancel', handler: () => this.isAlertOpen.set(false) },
        { text: 'Confirmar', handler: () => this.confirmAndSubmit() },
      ];
    }
    // For 'Error' or 'Voto Emitido'
    return [{ text: 'OK', role: 'confirm' }];
  }
}
