import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, runInInjectionContext, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AdminListBase } from '../shared/admin-list-base';
import { AssociationDto, BranchDto, ChapterDto } from '../../../core/models/structure.models';
import { PartyDto } from '../../../core/models/parties.models';
import { AssociationsService } from '../../../core/services/associations.service';
import { BranchesService } from '../../../core/services/branches.service';
import { ChaptersService } from '../../../core/services/chapters.service';
import { PartiesService } from '../../../core/services/parties.service';
import { Injector } from '@angular/core';

@Component({
  selector: 'app-admin-parties-section',
  standalone: true,
  templateUrl: 'admin-parties.section.html',
  imports: [CommonModule, ReactiveFormsModule],
})
export class AdminPartiesSection extends AdminListBase implements OnInit {
  associations = signal<AssociationDto[]>([]);
  branches = signal<BranchDto[]>([]);
  chapters = signal<ChapterDto[]>([]);
  parties = signal<PartyDto[]>([]);

  partyFilter = signal('');
  partyStatusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  partyAssociationFilter = signal('');
  partyBranchFilter = signal('');
  partyPage = signal(0);

  partyScopeNotice = signal<string | null>(null);
  editingPartyId: string | null = null;

  readonly partyForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    acronym: [''],
    scope: ['ASSOCIATION' as PartyDto['scope']],
    associationId: [''],
    branchId: [''],
    chapterId: [''],
    isActive: [true],
  });

  readonly partyScopes: PartyDto['scope'][] = ['ASSOCIATION', 'BRANCH', 'CHAPTER'];

  readonly filteredParties = computed(() =>
    this.parties()
      .filter((party) => {
        const status = this.partyStatusFilter();
        if (status === 'ACTIVE' && !party.isActive) {
          return false;
        }
        if (status === 'INACTIVE' && party.isActive) {
          return false;
        }
        return true;
      })
      .filter((party) =>
        this.matchesTerm(this.partyFilter(), `${party.name} ${party.acronym ?? ''}`),
      ),
  );

  readonly pagedParties = computed(() => this.paginate(this.filteredParties(), this.partyPage()));
  readonly partyPages = computed(() => this.pageCount(this.filteredParties()));

  readonly partyBranchesForAssociation = computed(() => {
    const associationId = this.partyAssociationFilter();
    if (!associationId) {
      return this.branches();
    }
    return this.branches().filter((branch) => branch.associationId === associationId);
  });

  readonly partyChaptersForBranch = computed(() => {
    const branchId = this.partyBranchFilter();
    if (!branchId) {
      return [];
    }
    return this.chapters().filter((chapter) => chapter.branchId === branchId);
  });

  readonly partyBranchesAvailable = computed(() => this.partyBranchesForAssociation().length > 0);
  readonly partyChaptersAvailable = computed(() => this.partyChaptersForBranch().length > 0);

  private injector = inject(Injector);

  constructor(
    private fb: FormBuilder,
    private partiesService: PartiesService,
    private associationsService: AssociationsService,
    private branchesService: BranchesService,
    private chaptersService: ChaptersService,
    toastController: ToastController,
  ) {
    super(toastController);
  }

  async ngOnInit(): Promise<void> {
    this.resetPagesOnFilterChange();
    await Promise.all([
      this.loadParties(),
      this.loadAssociations(),
      this.loadBranches(),
      this.loadChapters(),
    ]);
  }

  private resetPagesOnFilterChange() {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        this.partyFilter();
        this.partyStatusFilter();
        this.partyPage.set(0);
      });
    });
  }

  async loadParties() {
    this.parties.set(await firstValueFrom(this.partiesService.list()));
  }

  async loadAssociations() {
    this.associations.set(await firstValueFrom(this.associationsService.list()));
  }

  async loadBranches() {
    this.branches.set(await firstValueFrom(this.branchesService.list()));
  }

  async loadChapters() {
    this.chapters.set(await firstValueFrom(this.chaptersService.list()));
  }

  getPartyScopeLabel(scope: PartyDto['scope'] | null | undefined): string {
    switch (scope) {
      case 'ASSOCIATION':
        return 'Asociación';
      case 'BRANCH':
        return 'Sede';
      case 'CHAPTER':
        return 'Capítulo';
      default:
        return 'Nacional';
    }
  }

  async saveParty() {
    if (this.partyForm.invalid) {
      this.partyForm.markAllAsTouched();
      return;
    }
    const value = this.partyForm.getRawValue();
    const payload = {
      name: value.name,
      acronym: value.acronym || undefined,
      scope: value.scope,
      associationId: value.associationId || undefined,
      branchId: value.branchId || undefined,
      chapterId: value.chapterId || undefined,
      isActive: value.isActive,
    };
    if (this.editingPartyId) {
      await firstValueFrom(this.partiesService.update(this.editingPartyId, payload));
      await this.notify('Partido actualizado.');
    } else {
      await firstValueFrom(this.partiesService.create(payload));
      await this.notify('Partido creado.');
    }
    this.resetPartyForm();
    await this.loadParties();
  }

  editParty(party: PartyDto) {
    this.editingPartyId = party.id;
    this.partyAssociationFilter.set(
      party.associationId ?? party.branch?.association?.id ?? party.chapter?.branch?.association?.id ?? '',
    );
    this.partyBranchFilter.set(party.branchId ?? party.chapter?.branch?.id ?? '');
    this.partyForm.reset({
      name: party.name,
      acronym: party.acronym ?? '',
      scope: party.scope,
      associationId: party.associationId ?? '',
      branchId: party.branchId ?? '',
      chapterId: party.chapterId ?? '',
      isActive: party.isActive,
    });
  }

  resetPartyForm() {
    this.editingPartyId = null;
    this.partyScopeNotice.set(null);
    this.partyAssociationFilter.set('');
    this.partyBranchFilter.set('');
    this.partyForm.reset({
      name: '',
      acronym: '',
      scope: 'ASSOCIATION',
      associationId: '',
      branchId: '',
      chapterId: '',
      isActive: true,
    });
  }

  async deleteParty(party: PartyDto) {
    if (!window.confirm(`Eliminar el partido ${party.name}?`)) {
      return;
    }
    await firstValueFrom(this.partiesService.delete(party.id));
    await this.notify('Partido eliminado.');
    await this.loadParties();
  }

  onPartyScopeChange() {
    const scope = this.partyForm.controls.scope.value;
    this.partyScopeNotice.set(null);
    if (scope === 'ASSOCIATION') {
      this.partyForm.patchValue({ associationId: '', branchId: '', chapterId: '' });
      this.partyAssociationFilter.set('');
      this.partyBranchFilter.set('');
    } else if (scope === 'BRANCH') {
      this.partyForm.patchValue({ branchId: '', chapterId: '' });
      this.partyBranchFilter.set('');
    } else if (scope === 'CHAPTER') {
      this.partyForm.patchValue({ chapterId: '' });
      this.partyBranchFilter.set('');
    }
    this.ensureValidPartyScope();
  }

  onPartyAssociationChange(value: string) {
    this.partyScopeNotice.set(null);
    this.partyAssociationFilter.set(value);
    this.partyForm.patchValue({ branchId: '', chapterId: '' });
    this.partyBranchFilter.set('');
    this.ensureValidPartyScope();
  }

  onPartyBranchChange(value: string) {
    this.partyScopeNotice.set(null);
    this.partyBranchFilter.set(value);
    this.partyForm.patchValue({ chapterId: '' });
    this.ensureValidPartyScope();
  }

  private ensureValidPartyScope() {
    const scope = this.partyForm.controls.scope.value;
    if (scope === 'BRANCH' && !this.partyBranchesAvailable()) {
      this.partyForm.patchValue({ scope: 'ASSOCIATION', branchId: '', chapterId: '' });
      this.partyBranchFilter.set('');
      this.partyScopeNotice.set('No hay sedes disponibles. Se cambió el alcance a Asociación.');
    }
    if (scope === 'CHAPTER' && !this.partyBranchesAvailable()) {
      this.partyForm.patchValue({ scope: 'ASSOCIATION', branchId: '', chapterId: '' });
      this.partyBranchFilter.set('');
      this.partyScopeNotice.set('No hay sedes disponibles. Se cambió el alcance a Asociación.');
      return;
    }
    if (scope === 'CHAPTER' && this.partyBranchesAvailable() && !this.partyChaptersAvailable()) {
      this.partyForm.patchValue({ scope: 'BRANCH', chapterId: '' });
      this.partyScopeNotice.set('No hay capítulos disponibles. Se cambió el alcance a Sede.');
    }
  }
}
