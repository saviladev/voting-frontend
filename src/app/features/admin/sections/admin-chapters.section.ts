import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AdminListBase } from '../shared/admin-list-base';
import { AssociationDto, BranchDto, ChapterDto, SpecialtyDto } from '../../../core/models/structure.models';
import { AssociationsService } from '../../../core/services/associations.service';
import { BranchesService } from '../../../core/services/branches.service';
import { ChaptersService } from '../../../core/services/chapters.service';
import { SpecialtiesService } from '../../../core/services/specialties.service';
import { Injector } from '@angular/core';

@Component({
  selector: 'app-admin-chapters-section',
  standalone: true,
  templateUrl: 'admin-chapters.section.html',
  imports: [CommonModule, ReactiveFormsModule],
})
export class AdminChaptersSection extends AdminListBase implements OnInit {
  associations = signal<AssociationDto[]>([]);
  branches = signal<BranchDto[]>([]);
  specialties = signal<SpecialtyDto[]>([]);
  chapters = signal<ChapterDto[]>([]);

  chapterFilter = signal('');
  chapterBranchFilter = signal('');
  chapterSpecialtyFilter = signal('');
  chapterAssociationFilter = signal('');
  chapterPage = signal(0);

  chapterFormBranchId = signal('');
  chapterFormSpecialtyIds = signal<string[]>([]);
  chapterSpecialtiesOpen = signal(false);
  editingChapterId: string | null = null;

  @ViewChild('chapterSpecialtiesSelect') chapterSpecialtiesSelect?: ElementRef<HTMLElement>;

  readonly chapterForm = this.fb.nonNullable.group({
    branchId: ['', [Validators.required]],
    specialtyIds: [[] as string[]],
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly filteredChapters = computed(() =>
    this.chapters()
      .filter((chapter) => {
        const associationId = this.chapterAssociationFilter();
        const branchId = this.chapterBranchFilter();
        const specialtyId = this.chapterSpecialtyFilter();
        if (associationId) {
          if (chapter.branch?.association?.id !== associationId) {
            return false;
          }
        }
        if (branchId && chapter.branchId !== branchId) {
          return false;
        }
        if (
          specialtyId &&
          !chapter.specialties?.some((entry: { specialtyId: string }) => entry.specialtyId === specialtyId)
        ) {
          return false;
        }
        return true;
      })
      .filter((chapter) =>
        this.matchesTerm(
          this.chapterFilter(),
          `${chapter.name} ${chapter.branch?.name ?? ''} ${
            chapter.specialties
              ?.map((entry: { specialty?: { name?: string } }) => entry.specialty?.name ?? '')
              .join(' ') ?? ''
          }`,
        ),
      ),
  );

  readonly pagedChapters = computed(() => this.paginate(this.filteredChapters(), this.chapterPage()));
  readonly chapterPages = computed(() => this.pageCount(this.filteredChapters()));

  readonly branchesForChapterAssociation = computed(() => {
    const associationId = this.chapterAssociationFilter();
    if (!associationId) {
      return [];
    }
    return this.branches().filter((branch) => branch.associationId === associationId);
  });

  readonly specialtiesForChapter = computed(() => {
    const associationId = this.chapterAssociationFilter();
    if (!associationId) {
      return [];
    }
    const branchId = this.chapterFormBranchId();
    if (!branchId) {
      return [];
    }
    const assignedInBranch = new Set(
      this.chapters()
        .filter((chapter) => chapter.branchId === branchId)
        .reduce<string[]>((acc, chapter) => {
          const ids = chapter.specialties?.map((entry: { specialtyId: string }) => entry.specialtyId) ?? [];
          return acc.concat(ids);
        }, []),
    );
    const currentChapterSpecialties = new Set(
      this.chapters()
        .find((chapter) => chapter.id === this.editingChapterId)
        ?.specialties?.map((entry: { specialtyId: string }) => entry.specialtyId) ?? [],
    );
    return this.specialties().filter((specialty) => {
      if (specialty.associationId !== associationId) {
        return false;
      }
      if (!assignedInBranch.has(specialty.id)) {
        return true;
      }
      return currentChapterSpecialties.has(specialty.id);
    });
  });

  readonly specialtiesForChapterFilter = computed(() => {
    const associationId = this.chapterAssociationFilter();
    if (!associationId) {
      return this.specialties();
    }
    return this.specialties().filter((specialty) => specialty.associationId === associationId);
  });

  readonly selectedChapterSpecialties = computed(() => {
    const specialtyIds = this.chapterFormSpecialtyIds();
    if (!specialtyIds.length) {
      return [];
    }
    return this.specialties().filter((specialty) => specialtyIds.includes(specialty.id));
  });

  private injector = inject(Injector);

  constructor(
    private fb: FormBuilder,
    private chaptersService: ChaptersService,
    private branchesService: BranchesService,
    private specialtiesService: SpecialtiesService,
    private associationsService: AssociationsService,
    toastController: ToastController,
  ) {
    super(toastController);
  }

  async ngOnInit(): Promise<void> {
    this.resetPagesOnFilterChange();
    await Promise.all([
      this.loadChapters(),
      this.loadBranches(),
      this.loadSpecialties(),
      this.loadAssociations(),
    ]);
  }

  private resetPagesOnFilterChange() {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        this.chapterFilter();
        this.chapterAssociationFilter();
        this.chapterBranchFilter();
        this.chapterSpecialtyFilter();
        this.chapterPage.set(0);
      });
    });
  }

  async loadChapters() {
    this.chapters.set(await firstValueFrom(this.chaptersService.list()));
  }

  async loadBranches() {
    this.branches.set(await firstValueFrom(this.branchesService.list()));
  }

  async loadSpecialties() {
    this.specialties.set(await firstValueFrom(this.specialtiesService.list()));
  }

  async loadAssociations() {
    this.associations.set(await firstValueFrom(this.associationsService.list()));
  }

  async saveChapter() {
    if (this.chapterForm.invalid) {
      this.chapterForm.markAllAsTouched();
      return;
    }
    if (!this.chapterAssociationFilter()) {
      await this.notify('Selecciona una asociación primero.', 'warning');
      return;
    }
    const value = this.chapterForm.getRawValue();
    if (!value.specialtyIds.length) {
      delete (value as { specialtyIds?: string[] }).specialtyIds;
    }
    if (this.editingChapterId) {
      await firstValueFrom(this.chaptersService.update(this.editingChapterId, value));
      await this.notify('Capítulo actualizado.');
    } else {
      await firstValueFrom(this.chaptersService.create(value));
      await this.notify('Capítulo creado.');
    }
    this.resetChapterForm(!this.editingChapterId);
    await this.loadChapters();
  }

  editChapter(chapter: ChapterDto) {
    this.editingChapterId = chapter.id;
    this.chapterAssociationFilter.set(chapter.branch?.association?.id ?? '');
    this.chapterForm.reset({
      branchId: chapter.branchId,
      specialtyIds: chapter.specialties?.map((entry: { specialtyId: string }) => entry.specialtyId) ?? [],
      name: chapter.name,
    });
    this.chapterFormBranchId.set(chapter.branchId);
    this.chapterFormSpecialtyIds.set(
      chapter.specialties?.map((entry: { specialtyId: string }) => entry.specialtyId) ?? [],
    );
  }

  resetChapterForm(keepSelection = false) {
    this.editingChapterId = null;
    if (keepSelection) {
      this.chapterForm.reset({
        branchId: this.chapterForm.controls.branchId.value,
        specialtyIds: [],
        name: '',
      });
      this.chapterFormBranchId.set(this.chapterForm.controls.branchId.value);
      this.chapterFormSpecialtyIds.set([]);
      return;
    }
    this.chapterAssociationFilter.set('');
    this.chapterForm.reset({ branchId: '', specialtyIds: [], name: '' });
    this.chapterFormBranchId.set('');
    this.chapterFormSpecialtyIds.set([]);
  }

  async deleteChapter(chapter: ChapterDto) {
    if (!window.confirm(`Eliminar el capítulo ${chapter.name}?`)) {
      return;
    }
    await firstValueFrom(this.chaptersService.delete(chapter.id));
    await this.notify('Capítulo eliminado.');
    await this.loadChapters();
  }

  onChapterAssociationChange(value: string) {
    this.chapterAssociationFilter.set(value);
    this.chapterForm.patchValue({ branchId: '', specialtyIds: [] });
    this.chapterFormBranchId.set('');
    this.chapterFormSpecialtyIds.set([]);
  }

  onChapterAssociationFilterChange(value: string) {
    this.chapterAssociationFilter.set(value);
    this.chapterBranchFilter.set('');
    this.chapterSpecialtyFilter.set('');
  }

  onChapterBranchChange(value: string) {
    this.chapterForm.patchValue({ branchId: value, specialtyIds: [] });
    this.chapterFormBranchId.set(value);
    this.chapterFormSpecialtyIds.set([]);
  }

  toggleChapterSpecialtySelection(specialtyId: string) {
    const current = this.chapterFormSpecialtyIds();
    const exists = current.includes(specialtyId);
    const next = exists ? current.filter((id) => id !== specialtyId) : [...current, specialtyId];
    this.chapterForm.patchValue({ specialtyIds: next });
    this.chapterFormSpecialtyIds.set(next);
  }

  toggleChapterSpecialtiesDropdown() {
    this.chapterSpecialtiesOpen.set(!this.chapterSpecialtiesOpen());
  }

  removeChapterSpecialty(specialtyId: string) {
    const current = this.chapterFormSpecialtyIds();
    const next = current.filter((id) => id !== specialtyId);
    this.chapterForm.patchValue({ specialtyIds: next });
    this.chapterFormSpecialtyIds.set(next);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.chapterSpecialtiesOpen()) {
      return;
    }
    const target = event.target as Node | null;
    if (!target || !this.chapterSpecialtiesSelect?.nativeElement.contains(target)) {
      this.chapterSpecialtiesOpen.set(false);
    }
  }

  getSpecialtiesCount(chapter: ChapterDto): number {
    return chapter.specialties?.length ?? 0;
  }
}

