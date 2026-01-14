import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonList, IonItem, IonLabel, IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { VotingService } from '../../../core/services/voting.service';
import { ElectionDto } from '../../../core/models/elections.models';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-voting-page',
  templateUrl: './voting.page.html',
  styleUrls: ['./voting.page.scss'],
  standalone: true,
  imports: [CommonModule, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonList, IonItem, IonLabel, IonButton, IonIcon, IonSpinner],
})
export class VotingPage implements OnInit {
  elections = signal<ElectionDto[]>([]);
  status = signal<'loading' | 'loaded' | 'error'>('loading');

  constructor(private votingService: VotingService, private router: Router) {
    addIcons({ chevronForwardOutline });
  }

  ngOnInit(): void {
    this.loadVotableElections();
  }

  loadVotableElections(): void {
    this.status.set('loading');
    this.votingService.getVotableElections().subscribe({
      next: (elections) => {
        this.elections.set(elections);
        this.status.set('loaded');
      },
      error: () => {
        this.status.set('error');
      }
    });
  }

  navigateToVote(electionId: string): void {
    this.router.navigate(['/admin/voting', electionId]);
  }
}