import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, runInInjectionContext, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AdminListBase } from '../shared/admin-list-base';
import { AssociationDto } from '../../../core/models/structure.models';
import { AssociationsService } from '../../../core/services/associations.service';
import { Injector } from '@angular/core';

@Component({
  selector: 'app-admin-associations-section',
  standalone: true,
  templateUrl: 'admin-associations.section.html',
  imports: [CommonModule, ReactiveFormsModule],
})
export class AdminAssociationsSection extends AdminListBase implements OnInit {
  associations = signal<AssociationDto[]>([]);

  associationFilter = signal('');
  associationPage = signal(0);
  editingAssociationId: string | null = null;

  readonly associationForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly filteredAssociations = computed(() =>
    this.filterBy(this.associations(), this.associationFilter(), (association) => association.name),
  );

  readonly pagedAssociations = computed(() =>
    this.paginate(this.filteredAssociations(), this.associationPage()),
  );
  readonly associationPages = computed(() => this.pageCount(this.filteredAssociations()));

  private injector = inject(Injector);

  constructor(
    private fb: FormBuilder,
    private associationsService: AssociationsService,
    toastController: ToastController,
  ) {
    super(toastController);
  }

  async ngOnInit(): Promise<void> {
    this.resetPagesOnFilterChange();
    await this.loadAssociations();
  }

  private resetPagesOnFilterChange() {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        this.associationFilter();
        this.associationPage.set(0);
      });
    });
  }

  async loadAssociations() {
    this.associations.set(await firstValueFrom(this.associationsService.list()));
  }

  async saveAssociation() {
    if (this.associationForm.invalid) {
      this.associationForm.markAllAsTouched();
      return;
    }
    const value = this.associationForm.getRawValue();
    if (this.editingAssociationId) {
      await firstValueFrom(this.associationsService.update(this.editingAssociationId, value));
      await this.notify('Asociación actualizada.');
    } else {
      await firstValueFrom(this.associationsService.create(value));
      await this.notify('Asociación creada.');
    }
    this.resetAssociationForm();
    await this.loadAssociations();
  }

  editAssociation(association: AssociationDto) {
    this.editingAssociationId = association.id;
    this.associationForm.reset({ name: association.name });
  }

  resetAssociationForm() {
    this.editingAssociationId = null;
    this.associationForm.reset({ name: '' });
  }

  async deleteAssociation(association: AssociationDto) {
    if (!window.confirm(`Eliminar la asociación ${association.name}?`)) {
      return;
    }
    await firstValueFrom(this.associationsService.delete(association.id));
    await this.notify('Asociación eliminada.');
    await this.loadAssociations();
  }
}
