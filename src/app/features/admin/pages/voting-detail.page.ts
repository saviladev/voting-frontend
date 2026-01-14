import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, IonList, IonListHeader,
  IonItem, IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton,
  IonAvatar, IonAlert, IonBackButton, IonButtons
} from '@ionic/angular/standalone';
import { ElectionsService } from '../../../core/services/elections.service';
import { VotingService } from '../../../core/services/voting.service';
import { ElectionDto, CandidateDto } from '../../../core/models/elections.models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-voting-detail-page',
  templateUrl: './voting-detail.page.html',
  styleUrls: ['./voting-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, IonList,
    IonListHeader, IonItem, IonLabel, IonCard, IonCardHeader, IonCardTitle,
    IonCardContent, IonButton, IonAvatar, IonAlert, IonBackButton, IonButtons
  ],
})
export class VotingDetailPage implements OnInit {
  election = signal<ElectionDto | null>(null);
  status = signal<'loading' | 'loaded' | 'error'>('loading');
  selectedCandidate = signal<CandidateDto | null>(null);
  isAlertOpen = signal(false);
  alertHeader = '';
  alertMessage = '';

  private electionId: string;

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

  get alertButtons() {
    if (this.alertHeader === 'Confirmar Voto') {
      return [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => this.isAlertOpen.set(false),
        },
        {
          text: 'Confirmar Voto',
          handler: () => this.confirmVote(),
        },
      ];
    } else {
      return [
        {
          text: 'OK',
          role: 'confirm',
          handler: () => this.handleAlertDismiss(),
        },
      ];
    }
  }

  async loadElectionDetails() {
    this.status.set('loading');
    try {
      const election = await firstValueFrom(this.electionsService.get(this.electionId)) as ElectionDto;
      this.election.set(election);
      this.status.set('loaded');
    } catch (error) {
      this.status.set('error');
    }
  }

  selectCandidate(candidate: CandidateDto) {
    this.selectedCandidate.set(candidate);
    this.alertHeader = 'Confirmar Voto';
    this.alertMessage = `¿Estás seguro de que quieres votar por ${candidate.firstName} ${candidate.lastName}? Esta acción no se puede deshacer.`;
    this.isAlertOpen.set(true);
  }

  async confirmVote() {
    const candidate = this.selectedCandidate();
    if (!candidate) return;

    try {
      await firstValueFrom(this.votingService.vote(this.electionId, candidate.id));
      this.alertHeader = 'Voto Emitido';
      this.alertMessage = 'Gracias por participar. Tu voto ha sido registrado correctamente.';
      // We will show a success alert and then navigate away
      // The `isAlertOpen` is already true, we just need to update the content and handler
    } catch (error: any) {
      const errorMessage = error.error?.message || 'No se pudo registrar el voto.';
      this.alertHeader = 'Error';
      this.alertMessage = errorMessage;
    }
  }

  handleAlertDismiss() {
    this.isAlertOpen.set(false);
    // If the vote was successful, navigate back to the list
    if (this.alertHeader === 'Voto Emitido') {
      this.router.navigate(['/admin/voting']);
    }
  }
}
