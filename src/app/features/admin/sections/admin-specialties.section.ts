import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, runInInjectionContext, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AdminListBase } from '../shared/admin-list-base';
import { AssociationDto, SpecialtyDto } from '../../../core/models/structure.models';
import { AssociationsService } from '../../../core/services/associations.service';
import { SpecialtiesService } from '../../../core/services/specialties.service';
import { Injector } from '@angular/core';

@Component({
  selector: 'app-admin-specialties-section',
  standalone: true,
  templateUrl: 'admin-specialties.section.html',
  imports: [CommonModule, ReactiveFormsModule],
})
export class AdminSpecialtiesSection extends AdminListBase implements OnInit {
  associations = signal<AssociationDto[]>([]);
  specialties = signal<SpecialtyDto[]>([]);

  specialtyFilter = signal('');
  specialtyAssociationFilter = signal('');
  specialtyPage = signal(0);
  editingSpecialtyId: string | null = null;

  readonly specialtyForm = this.fb.nonNullable.group({
    associationId: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly filteredSpecialties = computed(() =>
    this.specialties()
      .filter((specialty) => {
        const associationId = this.specialtyAssociationFilter();
        if (!associationId) {
          return true;
        }
        return specialty.associationId === associationId;
      })
      .filter((specialty) =>
        this.matchesTerm(
          this.specialtyFilter(),
          `${specialty.name} ${specialty.association?.name ?? ''}`,
        ),
      ),
  );

  readonly pagedSpecialties = computed(() =>
    this.paginate(this.filteredSpecialties(), this.specialtyPage()),
  );
  readonly specialtyPages = computed(() => this.pageCount(this.filteredSpecialties()));

  private injector = inject(Injector);

  constructor(
    private fb: FormBuilder,
    private specialtiesService: SpecialtiesService,
    private associationsService: AssociationsService,
    toastController: ToastController,
  ) {
    super(toastController);
  }

  async ngOnInit(): Promise<void> {
    this.resetPagesOnFilterChange();
    await Promise.all([this.loadSpecialties(), this.loadAssociations()]);
  }

  private resetPagesOnFilterChange() {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        this.specialtyFilter();
        this.specialtyAssociationFilter();
        this.specialtyPage.set(0);
      });
    });
  }

  async loadSpecialties() {
    this.specialties.set(await firstValueFrom(this.specialtiesService.list()));
  }

  async loadAssociations() {
    this.associations.set(await firstValueFrom(this.associationsService.list()));
  }

  async saveSpecialty() {
    if (this.specialtyForm.invalid) {
      this.specialtyForm.markAllAsTouched();
      return;
    }
    const value = this.specialtyForm.getRawValue();
    if (this.editingSpecialtyId) {
      await firstValueFrom(this.specialtiesService.update(this.editingSpecialtyId, value));
      await this.notify('Especialidad actualizada.');
    } else {
      await firstValueFrom(this.specialtiesService.create(value));
      await this.notify('Especialidad creada.');
    }
    this.resetSpecialtyForm();
    await this.loadSpecialties();
  }

  editSpecialty(specialty: SpecialtyDto) {
    this.editingSpecialtyId = specialty.id;
    this.specialtyForm.reset({ name: specialty.name, associationId: specialty.associationId });
  }

  resetSpecialtyForm() {
    this.editingSpecialtyId = null;
    this.specialtyForm.reset({ name: '', associationId: '' });
  }

  async deleteSpecialty(specialty: SpecialtyDto) {
    if (!window.confirm(`Eliminar la especialidad ${specialty.name}?`)) {
      return;
    }
    await firstValueFrom(this.specialtiesService.delete(specialty.id));
    await this.notify('Especialidad eliminada.');
    await this.loadSpecialties();
  }
}
