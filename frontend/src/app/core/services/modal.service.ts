import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ModalType = 'confirm' | 'danger' | 'alert';

export interface ModalConfig {
  type?: ModalType;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  readonly config$ = new BehaviorSubject<ModalConfig | null>(null);
  private resolver: ((result: boolean) => void) | null = null;

  open(config: ModalConfig): Promise<boolean> {
    return new Promise(resolve => {
      this.resolver = resolve;
      this.config$.next(config);
    });
  }

  resolve(result: boolean): void {
    this.config$.next(null);
    this.resolver?.(result);
    this.resolver = null;
  }
}
