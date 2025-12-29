import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, runInInjectionContext, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AdminListBase } from '../shared/admin-list-base';
import { AssociationDto, BranchDto, ChapterDto } from '../../../core/models/structure.models';
import { ElectionDto, ElectionPositionDto } from '../../../core/models/elections.models';
import { AssociationsService } from '../../../core/services/associations.service';
import { BranchesService } from '../../../core/services/branches.service';
import { ChaptersService } from '../../../core/services/chapters.service';
import { ElectionsService } from '../../../core/services/elections.service';
import { Injector } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-elections-section',
  standalone: true,
  templateUrl: 'admin-elections.section.html',
  imports: [CommonModule, ReactiveFormsModule],
})
export class AdminElectionsSection extends AdminListBase implements OnInit {
  associations = signal<AssociationDto[]>([]);
  branches = signal<BranchDto[]>([]);
  chapters = signal<ChapterDto[]>([]);
  elections = signal<ElectionDto[]>([]);

  electionFilter = signal('');
  electionStatusFilter = signal<'ALL' | 'DRAFT' | 'OPEN' | 'CLOSED' | 'COMPLETED'>('ALL');
  electionPage = signal(0);
  
  scopeNotice = signal<string | null>(null);

  readonly electionForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(5)]],
    description: [''],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    scope: ['ASSOCIATION' as ElectionDto['scope'], Validators.required],
    associationId: ['', Validators.required],
    branchId: [''],
    chapterId: [''],
    positions: ['', Validators.required], // Textarea, one per line
  });

  readonly electionScopes: ElectionDto['scope'][] = ['ASSOCIATION', 'BRANCH', 'CHAPTER'];

  readonly filteredElections = computed(() =>
    this.elections()
      .filter((election) => {
        const status = this.electionStatusFilter();
        if (status !== 'ALL' && election.status !== status) {
          return false;
        }
        return true;
      })
      .filter((election) =>
        this.matchesTerm(this.electionFilter(), election.name),
      ),
  );

  readonly pagedElections = computed(() => this.paginate(this.filteredElections(), this.electionPage()));
  readonly electionPages = computed(() => this.pageCount(this.filteredElections()));

  selectedAssociationId = signal<string | null>(null);
  selectedBranchId = signal<string | null>(null);

  readonly branchesForAssociation = computed(() => {
    const associationId = this.selectedAssociationId();
    if (!associationId) return [];
    return this.branches().filter((b) => b.associationId === associationId);
  });

  readonly chaptersForBranch = computed(() => {
    const branchId = this.selectedBranchId();
    if (!branchId) return [];
    return this.chapters().filter((c) => c.branchId === branchId);
  });

  readonly branchesAvailable = computed(() => this.branchesForAssociation().length > 0);
  readonly chaptersAvailable = computed(() => this.chaptersForBranch().length > 0);

  private injector = inject(Injector);

  constructor(
    private fb: FormBuilder,
    private electionsService: ElectionsService,
    private associationsService: AssociationsService,
    private branchesService: BranchesService,
    private chaptersService: ChaptersService,
    private router: Router,
    toastController: ToastController,
  ) {
    super(toastController);
  }

  async ngOnInit(): Promise<void> {
    this.resetPagesOnFilterChange();
    await Promise.all([
      this.loadElections(),
      this.loadAssociations(),
      this.loadBranches(),
      this.loadChapters(),
    ]);
  }

  private resetPagesOnFilterChange() {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        this.electionFilter();
        this.electionStatusFilter();
        this.electionPage.set(0);
      });
    });
  }

  async loadElections() {
    this.elections.set(await firstValueFrom(this.electionsService.list()));
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

  async createElection() {
    if (this.electionForm.invalid) {
      this.electionForm.markAllAsTouched();
      return;
    }
    const value = this.electionForm.getRawValue();
    
    // Parse positions
    const positionsRaw = value.positions || '';
    const positionsList = positionsRaw.split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map((title, index) => ({ title, order: index }));

    if (positionsList.length === 0) {
        await this.notify('Debe definir al menos un cargo', 'warning');
        return;
    }

    const payload = {
        name: value.name!,
        description: value.description || undefined,
        startDate: value.startDate!,
        endDate: value.endDate!,
        scope: value.scope!,
        associationId: value.associationId!,
        branchId: value.branchId || undefined,
        chapterId: value.chapterId || undefined,
        positions: positionsList
    };

    try {
        await firstValueFrom(this.electionsService.create(payload));
        await this.notify('Elección creada exitosamente.');
        this.resetForm();
        await this.loadElections();
    } catch (e) {
        console.error(e);
        await this.notify('Error al crear la elección', 'danger');
    }
  }

  resetForm() {
    this.electionForm.reset({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        scope: 'ASSOCIATION',
        associationId: '',
        branchId: '',
        chapterId: '',
        positions: ''
    });
    this.selectedAssociationId.set(null);
    this.selectedBranchId.set(null);
    this.scopeNotice.set(null);
  }

  onScopeChange() {
      const scope = this.electionForm.controls.scope.value;
      this.electionForm.patchValue({ branchId: '', chapterId: '' });
      this.selectedBranchId.set(null);
      this.checkScopeValidity();
  }

  onAssociationChange() {
      const val = this.electionForm.controls.associationId.value;
      this.selectedAssociationId.set(val || null);
      this.electionForm.patchValue({ branchId: '', chapterId: '' });
      this.selectedBranchId.set(null);
      this.checkScopeValidity();
  }

  onBranchChange() {
      const val = this.electionForm.controls.branchId.value;
      this.selectedBranchId.set(val || null);
      this.electionForm.patchValue({ chapterId: '' });
      this.checkScopeValidity();
  }

  private checkScopeValidity() {
      // Basic validity checks if needed, similar to parties section
      const scope = this.electionForm.controls.scope.value;
      this.scopeNotice.set(null);
      
      if (scope === 'BRANCH' && !this.branchesAvailable() && this.electionForm.controls.associationId.value) {
           this.scopeNotice.set('Esta asociación no tiene sedes.');
      }
  }

  viewDetails(election: ElectionDto) {
      this.router.navigate(['/admin/elections', election.id]);
  }
}
