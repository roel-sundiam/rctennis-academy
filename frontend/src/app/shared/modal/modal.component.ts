import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService, ModalConfig } from '../../core/services/modal.service';

@Component({
  selector: 'app-modal',
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class ModalComponent {
  config: ModalConfig | null = null;

  constructor(private modalService: ModalService) {
    this.modalService.config$.subscribe(cfg => (this.config = cfg));
  }

  get confirmLabel(): string {
    return this.config?.confirmLabel ?? (this.config?.type === 'alert' ? 'OK' : 'Confirm');
  }

  get cancelLabel(): string {
    return this.config?.cancelLabel ?? 'Cancel';
  }

  confirm(): void {
    this.modalService.resolve(true);
  }

  cancel(): void {
    this.modalService.resolve(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.config) this.cancel();
  }
}
