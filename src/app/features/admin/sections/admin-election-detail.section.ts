import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { ElectionsService } from '../../../core/services/elections.service';
import { PartiesService } from '../../../core/services/parties.service';
import { ElectionDto, CandidateListDto, ElectionPositionDto } from '../../../core/models/elections.models';
import { PartyDto } from '../../../core/models/parties.models';

@Component({
  selector: 'app-admin-election-detail',
  standalone: true,
  templateUrl: 'admin-election-detail.section.html',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
})
export class AdminElectionDetailSection implements OnInit {
  election = signal<ElectionDto | null>(null);
  parties = signal<PartyDto[]>([]);
  
  // UI State
  showCreateListForm = signal(false);
  activeListForCandidateStr = signal<string | null>(null); // List ID to add candidate to
  editMode = signal(false);
  editingCandidateId = signal<string | null>(null);

  readonly listForm = this.fb.group({
    name: ['', Validators.required],
    number: [null as number | null],
    politicalPartyId: ['', Validators.required],
  });

  readonly candidateForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    dni: [''],
    positionId: ['', Validators.required],
  });

  readonly editForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    status: ['DRAFT', Validators.required],
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private electionsService: ElectionsService,
    private partiesService: PartiesService,
    private fb: FormBuilder,
    private toastController: ToastController,
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/admin/elections']);
      return;
    }
    await this.loadElection(id);
    await this.loadParties();
  }

  async loadElection(id: string) {
    try {
      const data = await firstValueFrom(this.electionsService.get(id));
      this.election.set(data);
    } catch (e) {
      this.notify('Error al cargar la elección', 'danger');
      this.router.navigate(['/admin/elections']);
    }
  }

  async loadParties() {
    try {
      this.parties.set(await firstValueFrom(this.partiesService.list()));
    } catch (e) {
      console.error('Error loading parties', e);
    }
  }

  getScopeLabel(scope: string): string {
    switch (scope) {
      case 'ASSOCIATION': return 'Asociación';
      case 'BRANCH': return 'Sede';
      case 'CHAPTER': return 'Capítulo';
      default: return 'Nacional';
    }
  }

  getStatusLabel(status: string): string {
      switch (status) {
          case 'DRAFT': return 'Borrador';
          case 'OPEN': return 'Abierta';
          case 'CLOSED': return 'Cerrada';
          case 'COMPLETED': return 'Completada';
          default: return status;
      }
  }

  toggleCreateList() {
    this.showCreateListForm.set(!this.showCreateListForm());
    if (this.showCreateListForm()) {
      this.listForm.reset();
    }
  }

  async createList() {
    if (this.listForm.invalid || !this.election()) {
      this.listForm.markAllAsTouched();
      return;
    }
    const val = this.listForm.value;
    try {
      await firstValueFrom(this.electionsService.createList(this.election()!.id, {
        name: val.name!,
        number: val.number || undefined,
        politicalPartyId: val.politicalPartyId!,
        electionId: this.election()!.id
      }));
      await this.notify('Lista creada exitosamente');
      this.toggleCreateList();
      await this.loadElection(this.election()!.id);
    } catch (e) {
      this.notify('Error al crear lista', 'danger');
    }
  }

  openAddCandidate(listId: string) {
    this.activeListForCandidateStr.set(listId);
    this.candidateForm.reset();
    // Default to first position if available ?? No, let user choose
  }

  cancelAddCandidate() {
    this.activeListForCandidateStr.set(null);
  }

  async saveCandidate() {
     if (this.candidateForm.invalid || !this.activeListForCandidateStr()) {
      this.candidateForm.markAllAsTouched();
      return;
    }
    const val = this.candidateForm.value;
    try {
        await firstValueFrom(this.electionsService.addCandidate(this.activeListForCandidateStr()!, {
            firstName: val.firstName!,
            lastName: val.lastName!,
            dni: val.dni || undefined,
            positionId: val.positionId!,
            candidateListId: this.activeListForCandidateStr()!
        }));
        await this.notify('Candidato agregado');
        this.cancelAddCandidate();
        await this.loadElection(this.election()!.id);
    } catch (e) {
        this.notify('Error al agregar candidato. Verifique que el cargo no esté ocupado en esta lista.', 'danger'); // Simple error, assuming validation
    }
  }

  getCandidatesForPosition(list: CandidateListDto, positionId: string) {
      return list.candidates.filter(c => c.positionId === positionId);
  }

  isListComplete(list: CandidateListDto): boolean {
    if (!this.election()) return false;
    const totalPositions = this.election()!.positions.length;
    const filledPositions = list.candidates.length;
    return filledPositions >= totalPositions;
  }

  private toDateTimeLocal(isoString: string): string {
    // Convert ISO 8601 to YYYY-MM-DDTHH:mm format for datetime-local input
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  toggleEditMode() {
    const isEditing = !this.editMode();
    this.editMode.set(isEditing);
    
    if (isEditing && this.election()) {
      const e = this.election()!;
      this.editForm.patchValue({
        name: e.name,
        description: e.description || '',
        startDate: this.toDateTimeLocal(e.startDate),
        endDate: this.toDateTimeLocal(e.endDate),
        status: e.status,
      });
    }
  }

  cancelEdit() {
    this.editMode.set(false);
  }

  async updateElection() {
    if (this.editForm.invalid || !this.election()) {
      this.editForm.markAllAsTouched();
      return;
    }

    const val = this.editForm.value;
    try {
      await firstValueFrom(this.electionsService.update(this.election()!.id, {
        name: val.name!,
        description: val.description || undefined,
        startDate: val.startDate!,
        endDate: val.endDate!,
        status: val.status as 'DRAFT' | 'OPEN' | 'CLOSED' | 'COMPLETED',
      }));
      await this.notify('Elección actualizada exitosamente');
      this.editMode.set(false);
      await this.loadElection(this.election()!.id);
    } catch (e) {
      console.error(e);
      await this.notify('Error al actualizar la elección', 'danger');
    }
  }

  async deleteList(listId: string, listName: string) {
    const confirmed = confirm(`¿Estás seguro de eliminar la lista "${listName}"? Se eliminarán también todos sus candidatos.`);
    if (!confirmed) return;

    try {
      await firstValueFrom(this.electionsService.deleteList(listId));
      await this.notify('Lista eliminada exitosamente');
      await this.loadElection(this.election()!.id);
    } catch (e) {
      console.error(e);
      await this.notify('Error al eliminar la lista', 'danger');
    }
  }

  editCandidate(candidate: any) {
    this.editingCandidateId.set(candidate.id);
    this.candidateForm.patchValue({
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      dni: candidate.dni || '',
      positionId: candidate.positionId,
    });
  }

  cancelEditCandidate() {
    this.editingCandidateId.set(null);
    this.candidateForm.reset();
  }

  async updateCandidate() {
    if (this.candidateForm.invalid || !this.editingCandidateId()) {
      this.candidateForm.markAllAsTouched();
      return;
    }

    const val = this.candidateForm.value;
    try {
      await firstValueFrom(this.electionsService.updateCandidate(this.editingCandidateId()!, {
        firstName: val.firstName!,
        lastName: val.lastName!,
        dni: val.dni || undefined,
      }));
      await this.notify('Candidato actualizado');
      this.cancelEditCandidate();
      await this.loadElection(this.election()!.id);
    } catch (e) {
      console.error(e);
      await this.notify('Error al actualizar candidato', 'danger');
    }
  }

  async deleteCandidate(candidateId: string, candidateName: string) {
    const confirmed = confirm(`¿Estás seguro de eliminar a ${candidateName}?`);
    if (!confirmed) return;

    try {
      await firstValueFrom(this.electionsService.deleteCandidate(candidateId));
      await this.notify('Candidato eliminado');
      await this.loadElection(this.election()!.id);
    } catch (e) {
      console.error(e);
      await this.notify('Error al eliminar candidato', 'danger');
    }
  }

  private async notify(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
    });
    await toast.present();
  }
}
