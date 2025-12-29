import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { PadronService, PadronImportResultDto } from '../../../core/services/padron.service';
import { AdminListBase } from '../shared/admin-list-base';

type PadronPreviewRow = {
  dni: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  branchName: string;
  chapterName: string;
  isPaidUp: string;
};

const MAX_PADRON_FILE_SIZE = 5 * 1024 * 1024;

@Component({
  selector: 'app-admin-padron-section',
  standalone: true,
  templateUrl: 'admin-padron.section.html',
  imports: [CommonModule],
})
export class AdminPadronSection extends AdminListBase {
  padronImportPreview = signal<PadronPreviewRow[]>([]);
  padronImportPreviewNote = signal('');

  showPadronResultModal = signal(false);
  padronModalTitle = signal('');
  padronModalSummary = signal('');
  padronModalStats = signal({ created: 0, updated: 0, disabled: 0, skipped: 0 });
  padronModalRejected = signal<string | null>(null);
  padronModalOmitted = signal<string[]>([]);

  private padronImportFile: File | null = null;

  constructor(
    private padronService: PadronService,
    toastController: ToastController,
  ) {
    super(toastController);
  }

  onPadronFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && file.size > MAX_PADRON_FILE_SIZE) {
      void this.notify('El archivo supera los 5MB permitidos.', 'warning');
      input.value = '';
      this.padronImportFile = null;
      this.padronImportPreview.set([]);
      return;
    }
    this.padronImportFile = file;
    if (!file) {
      return;
    }
    this.loadPadronPreview(file);
  }

  async uploadPadron() {
    const file = this.padronImportFile;
    if (!file) {
      await this.notify('Selecciona un archivo XLSX.', 'warning');
      return;
    }
    const result = await firstValueFrom(this.padronService.import(file));
    this.openPadronResultModal(result, 'Importación de padrón');
  }

  closePadronModal() {
    this.showPadronResultModal.set(false);
  }

  private openPadronResultModal(result: PadronImportResultDto, title: string) {
    this.padronModalTitle.set(title);
    this.padronModalStats.set({
      created: result.created ?? 0,
      updated: result.updated ?? 0,
      disabled: result.disabled ?? 0,
      skipped: result.skipped ?? 0,
    });
    this.padronModalRejected.set(result.message ?? null);
    const omitted = result.skippedDetails?.map((detail: { dni?: string; reason: string }) =>
      detail.dni ? `${detail.dni} (${detail.reason})` : detail.reason,
    ) ?? [];
    this.padronModalOmitted.set(omitted);
    this.padronModalSummary.set(`Procesamiento finalizado: ${result.created} creados, ${result.updated} actualizados.`);
    this.showPadronResultModal.set(true);
  }

  private loadPadronPreview(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as ArrayBuffer;
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) {
        return;
      }
      const rows = XLSX.utils.sheet_to_json<Record<string, string | number | boolean>>(sheet, {
        defval: '',
      });
      const preview = rows.slice(0, 6).map((row) => this.normalizePadronRow(row));
      const note = rows.length > preview.length ? `Mostrando ${preview.length} de ${rows.length}` : '';
      this.padronImportPreview.set(preview);
      this.padronImportPreviewNote.set(note);
    };
    reader.readAsArrayBuffer(file);
  }

  private normalizePadronRow(raw: Record<string, string | number | boolean>): PadronPreviewRow {
    const normalized: Record<string, string> = {};
    Object.entries(raw).forEach(([key, value]) => {
      const normalizedKey = key.toString().trim().toLowerCase().replace(/\s|_/g, '');
      normalized[normalizedKey] = String(value ?? '').trim();
    });

    const getValue = (aliases: string[]) => {
      for (const alias of aliases) {
        if (alias in normalized) {
          return normalized[alias];
        }
      }
      return '';
    };

    return {
      dni: getValue(['dni']),
      firstName: getValue(['firstname', 'nombres', 'name']),
      lastName: getValue(['lastname', 'apellidos', 'surname']),
      email: getValue(['email', 'correo']),
      phone: getValue(['phone', 'telefono', 'celular']),
      branchName: getValue(['branchname', 'sede', 'branch']),
      chapterName: getValue(['chaptername', 'capitulo', 'chapter']),
      isPaidUp: getValue(['ispaidup', 'pagosaldia', 'aldiam', 'aldia', 'activo', 'habilitado']),
    };
  }
}
