import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, runInInjectionContext, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AdminListBase } from '../shared/admin-list-base';
import { AssociationDto, BranchDto } from '../../../core/models/structure.models';
import { AssociationsService } from '../../../core/services/associations.service';
import { BranchesService } from '../../../core/services/branches.service';
import { Injector } from '@angular/core';

@Component({
  selector: 'app-admin-branches-section',
  standalone: true,
  templateUrl: 'admin-branches.section.html',
  imports: [CommonModule, ReactiveFormsModule],
})
export class AdminBranchesSection extends AdminListBase implements OnInit {
  associations = signal<AssociationDto[]>([]);
  branches = signal<BranchDto[]>([]);

  branchFilter = signal('');
  branchAssociationFilter = signal('');
  branchPage = signal(0);
  editingBranchId: string | null = null;

  readonly branchForm = this.fb.nonNullable.group({
    associationId: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly filteredBranches = computed(() =>
    this.branches()
      .filter((branch) => {
        const associationId = this.branchAssociationFilter();
        if (associationId && branch.associationId !== associationId) {
          return false;
        }
        return true;
      })
      .filter((branch) =>
        this.matchesTerm(
          this.branchFilter(),
          `${branch.name} ${branch.association?.name ?? ''}`,
        ),
      ),
  );

  readonly pagedBranches = computed(() => this.paginate(this.filteredBranches(), this.branchPage()));
  readonly branchPages = computed(() => this.pageCount(this.filteredBranches()));

  private injector = inject(Injector);

  constructor(
    private fb: FormBuilder,
    private branchesService: BranchesService,
    private associationsService: AssociationsService,
    toastController: ToastController,
  ) {
    super(toastController);
  }

  async ngOnInit(): Promise<void> {
    this.resetPagesOnFilterChange();
    await Promise.all([this.loadBranches(), this.loadAssociations()]);
  }

  private resetPagesOnFilterChange() {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        this.branchFilter();
        this.branchAssociationFilter();
        this.branchPage.set(0);
      });
    });
  }

  async loadBranches() {
    this.branches.set(await firstValueFrom(this.branchesService.list()));
  }

  async loadAssociations() {
    this.associations.set(await firstValueFrom(this.associationsService.list()));
  }

  async saveBranch() {
    if (this.branchForm.invalid) {
      this.branchForm.markAllAsTouched();
      return;
    }
    const value = this.branchForm.getRawValue();
    if (this.editingBranchId) {
      await firstValueFrom(this.branchesService.update(this.editingBranchId, value));
      await this.notify('Sede actualizada.');
    } else {
      await firstValueFrom(this.branchesService.create(value));
      await this.notify('Sede creada.');
    }
    this.resetBranchForm();
    await this.loadBranches();
  }

  editBranch(branch: BranchDto) {
    this.editingBranchId = branch.id;
    this.branchForm.reset({ associationId: branch.associationId, name: branch.name });
  }

  resetBranchForm() {
    this.editingBranchId = null;
    this.branchForm.reset({ associationId: '', name: '' });
  }

  async deleteBranch(branch: BranchDto) {
    if (!window.confirm(`Eliminar la sede ${branch.name}?`)) {
      return;
    }
    await firstValueFrom(this.branchesService.delete(branch.id));
    await this.notify('Sede eliminada.');
    await this.loadBranches();
  }
}
