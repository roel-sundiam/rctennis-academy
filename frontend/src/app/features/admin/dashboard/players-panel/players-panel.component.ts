import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlayerService } from '../../../../core/services/player.service';
import { Player } from '../../../../models/player.model';

@Component({
  selector: 'app-players-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './players-panel.component.html',
  styleUrl: './players-panel.component.scss'
})
export class PlayersPanelComponent implements OnInit {
  players: Player[] = [];
  loading = false;
  errorMessage = '';

  showAddForm = false;
  addForm = { name: '', contactNumber: '' };
  addError = '';
  addLoading = false;

  editingId: string | null = null;
  editForm = { name: '', contactNumber: '' };
  editError = '';
  editLoading = false;

  deleteLoading: Record<string, boolean> = {};

  constructor(private playerService: PlayerService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.playerService.getAllPlayers().subscribe({
      next: players => {
        this.players = players;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Failed to load players.';
        this.cdr.detectChanges();
      }
    });
  }

  startAdd(): void {
    this.showAddForm = true;
    this.addForm = { name: '', contactNumber: '' };
    this.addError = '';
  }

  cancelAdd(): void {
    this.showAddForm = false;
    this.addError = '';
  }

  submitAdd(): void {
    if (!this.addForm.name.trim()) { this.addError = 'Name is required.'; return; }
    this.addLoading = true;
    this.addError = '';
    this.playerService.createPlayer(this.addForm).subscribe({
      next: player => {
        this.players.push(player);
        this.players.sort((a, b) => a.name.localeCompare(b.name));
        this.showAddForm = false;
        this.addLoading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.addLoading = false;
        this.addError = err.error?.message || 'Failed to add player.';
        this.cdr.detectChanges();
      }
    });
  }

  startEdit(player: Player): void {
    this.editingId = player._id;
    this.editForm = { name: player.name, contactNumber: player.contactNumber || '' };
    this.editError = '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editError = '';
  }

  submitEdit(): void {
    if (!this.editForm.name.trim()) { this.editError = 'Name is required.'; return; }
    this.editLoading = true;
    this.editError = '';
    this.playerService.updatePlayer(this.editingId!, this.editForm).subscribe({
      next: updated => {
        const idx = this.players.findIndex(p => p._id === updated._id);
        if (idx > -1) this.players[idx] = updated;
        this.players.sort((a, b) => a.name.localeCompare(b.name));
        this.editingId = null;
        this.editLoading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.editLoading = false;
        this.editError = err.error?.message || 'Failed to update player.';
        this.cdr.detectChanges();
      }
    });
  }

  deletePlayer(id: string): void {
    if (!confirm('Deactivate this player? They will no longer appear in the booking form.')) return;
    this.deleteLoading[id] = true;
    this.playerService.deletePlayer(id).subscribe({
      next: () => {
        const p = this.players.find(p => p._id === id);
        if (p) p.isActive = false;
        this.deleteLoading[id] = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.deleteLoading[id] = false;
        this.cdr.detectChanges();
      }
    });
  }
}
