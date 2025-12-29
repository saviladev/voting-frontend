import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, runInInjectionContext, signal } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AdminListBase } from '../shared/admin-list-base';
import { AuditLogDto } from '../../../core/models/audit.models';
import { AuditService } from '../../../core/services/audit.service';
import { Injector } from '@angular/core';

@Component({
  selector: 'app-admin-audit-section',
  standalone: true,
  templateUrl: 'admin-audit.section.html',
  imports: [CommonModule],
})
export class AdminAuditSection extends AdminListBase implements OnInit {
  auditLogs = signal<AuditLogDto[]>([]);
  auditFilter = signal('');
  auditPage = signal(0);

  readonly filteredAudit = computed(() =>
    this.filterBy(this.auditLogs(), this.auditFilter(), (log) => `${log.action} ${log.entity}`),
  );

  readonly pagedAudit = computed(() => this.paginate(this.filteredAudit(), this.auditPage()));
  readonly auditPages = computed(() => this.pageCount(this.filteredAudit()));

  private injector = inject(Injector);

  constructor(
    private auditService: AuditService,
    toastController: ToastController,
  ) {
    super(toastController);
  }

  async ngOnInit(): Promise<void> {
    this.resetPagesOnFilterChange();
    await this.loadAuditLogs();
  }

  private resetPagesOnFilterChange() {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        this.auditFilter();
        this.auditPage.set(0);
      });
    });
  }

  async loadAuditLogs() {
    this.auditLogs.set(await firstValueFrom(this.auditService.listLogs({ limit: 60 })));
  }
}
