import { ToastController } from '@ionic/angular';

export abstract class AdminListBase {
  protected readonly pageSize = 10;

  protected constructor(protected toastController: ToastController) {}

  protected filterBy<T>(list: T[], term: string, selector: (item: T) => string): T[] {
    const needle = term.trim().toLowerCase();
    if (!needle) {
      return list;
    }
    return list.filter((item) => selector(item).toLowerCase().includes(needle));
  }

  protected matchesTerm(term: string, haystack: string): boolean {
    const needle = term.trim().toLowerCase();
    if (!needle) {
      return true;
    }
    return haystack.toLowerCase().includes(needle);
  }

  protected paginate<T>(list: T[], page: number): T[] {
    const start = page * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  protected pageCount(list: unknown[]): number {
    return Math.max(1, Math.ceil(list.length / this.pageSize));
  }

  changePage(pageSignal: { set: (value: number) => void; (): number }, totalPages: number, delta: number) {
    const next = Math.max(0, Math.min(totalPages - 1, pageSignal() + delta));
    pageSignal.set(next);
  }

  protected async notify(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2200,
      color,
    });
    await toast.present();
  }
}
