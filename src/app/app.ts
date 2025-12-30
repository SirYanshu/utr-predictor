import { RouterOutlet } from '@angular/router';
import { Component, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { UtrApiService } from './utr-api.service';
import { TennisWrappedComponent } from './tennis-wrapped.component';

interface Match {
  datetime: Date;
  playerName: string;
  opponentName: string;
  playerUTR: number;
  opponentUTR: number;
  playerGamesWon: number;
  opponentGamesWon: number;
  totalGames: number;
  winPercentage: string;
  setScores?: string;
}

interface CalculationResult {
  expectedResult: number;
  actualResult: number;
  matchRating: number;
  futureRating: number;
  ratingChange: number;
  performedBetter: boolean;
}

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    HttpClientModule,
    TennisWrappedComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  providers: [UtrApiService]
})
export class App implements OnInit {
  // ViewChild for Tennis Wrapped component
  @ViewChild(TennisWrappedComponent) wrappedComponent!: TennisWrappedComponent;
  
  // Authentication state
  isAuthenticated = signal<boolean>(false);
  jwtToken = signal<string>('');
  showAuthSection = signal<boolean>(true);
  authMessage = signal<string>('');
  authMessageType = signal<'success' | 'error' | 'info' | ''>('');
  
  // Player data
  playerId = signal<string>('');
  isLoadingData = signal<boolean>(false);
  
  // Using Angular signals for reactive state management
  matchData = signal<Match[]>([]);
  ratingHistory = signal<any[]>([]); // For week-by-week rating history
  currentRating = signal<number>(0);
  uploadStatus = signal<string>('');
  uploadStatusType = signal<'success' | 'error' | 'loading' | ''>('');
  showActionButtons = signal<boolean>(false);
  showCalculator = signal<boolean>(false);
  
  // Form fields
  opponentRating = signal<number | null>(null);
  setScores = signal<string>('');
  
  // Results
  calculationResults = signal<CalculationResult | null>(null);
  calculating = signal<boolean>(false);

  // Computed properties using Angular signals
  recentMatches = computed(() => this.matchData().slice(0, 10));
  totalMatches = computed(() => this.matchData().length);
  wins = computed(() => 
    this.matchData().filter(match => match.playerGamesWon > match.opponentGamesWon).length
  );
  winRate = computed(() => 
    this.totalMatches() > 0 ? ((this.wins() / this.totalMatches()) * 100).toFixed(1) : '0'
  );
  avgOpponentRating = computed(() => 
    this.totalMatches() > 0 ? 
      (this.matchData().reduce((sum, match) => sum + match.opponentUTR, 0) / this.totalMatches()).toFixed(2) : '0'
  );

  constructor(private utrApiService: UtrApiService) {}

  ngOnInit(): void {
    // Check if user already has a token
    if (this.utrApiService.isAuthenticated()) {
      const token = this.utrApiService.getToken();
      if (token) {
        this.jwtToken.set(token);
        this.isAuthenticated.set(true);
        this.showAuthSection.set(false);
        this.authMessage.set('Already authenticated! Enter your Player ID or search for your profile.');
        this.authMessageType.set('success');
      }
    }
  }

  /**
   * Set JWT token manually (from browser cookies or manual entry)
   */
  setAuthToken(): void {
    const token = this.jwtToken().trim();
    if (!token) {
      this.authMessage.set('Please enter a valid JWT token');
      this.authMessageType.set('error');
      return;
    }

    this.utrApiService.setToken(token);
    this.isAuthenticated.set(true);
    this.showAuthSection.set(false);
    this.authMessage.set('Successfully authenticated! Now enter your Player ID or search for your profile.');
    this.authMessageType.set('success');
  }

  /**
   * Search for player by name
   */
  searchPlayer(): void {
    // Removed - no longer needed
  }

  /**
   * Select a player from search results
   */
  selectPlayer(player: any): void {
    // Removed - no longer needed
  }

  /**
   * Load player data from UTR API
   */
  loadPlayerData(): void {
    const id = this.playerId().trim();
    if (!id) {
      this.uploadStatus.set('Please enter a Player ID');
      this.uploadStatusType.set('error');
      return;
    }

    if (!this.isAuthenticated()) {
      this.uploadStatus.set('Please authenticate first by entering your JWT token');
      this.uploadStatusType.set('error');
      return;
    }

    this.uploadStatus.set('Loading player data...');
    this.uploadStatusType.set('loading');
    this.isLoadingData.set(true);
    this.showActionButtons.set(false);
    this.showCalculator.set(false);

    // First, get the player profile
    this.utrApiService.getPlayerProfile(id).subscribe({
      next: (profile) => {
        this.currentRating.set(profile.singlesUtr || 0);
        
        // Then get their match results
        this.utrApiService.getPlayerResults(id).subscribe({
          next: (results) => {
            const matches = this.utrApiService.parseUTRResults(results, profile);
            this.matchData.set(matches);
            
            // Try to fetch rating history (Power feature)
            this.utrApiService.getRatingHistory(id).subscribe({
              next: (history) => {
                console.log('Rating history data:', history);
                this.ratingHistory.set(history);
              },
              error: (historyError) => {
                console.warn('Rating history not available:', historyError);
                // Continue without rating history
              }
            });
            
            if (matches.length > 0) {
              this.uploadStatus.set(`Successfully loaded ${matches.length} matches for ${profile.firstName} ${profile.lastName}!`);
              this.uploadStatusType.set('success');
              this.showActionButtons.set(true);
            } else {
              this.uploadStatus.set('No match data found for this player.');
              this.uploadStatusType.set('error');
            }
            this.isLoadingData.set(false);
          },
          error: (error) => {
            this.uploadStatus.set(`Failed to load match results: ${error.message || 'Unknown error'}`);
            this.uploadStatusType.set('error');
            this.isLoadingData.set(false);
            console.error('Results error:', error);
          }
        });
      },
      error: (error) => {
        this.uploadStatus.set(`Failed to load player profile: ${error.message || 'Unknown error'}`);
        this.uploadStatusType.set('error');
        this.isLoadingData.set(false);
        console.error('Profile error:', error);
      }
    });
  }

  /**
   * Logout and clear authentication
   */
  logout(): void {
    this.utrApiService.logout();
    this.isAuthenticated.set(false);
    this.jwtToken.set('');
    this.showAuthSection.set(true);
    this.playerId.set('');
    this.matchData.set([]);
    this.showActionButtons.set(false);
    this.showCalculator.set(false);
    this.authMessage.set('Logged out successfully');
    this.authMessageType.set('info');
  }

  openTennisWrapped(): void {
    if (this.wrappedComponent) {
      // Pass the rating history data when opening
      this.wrappedComponent.open(this.ratingHistory());
    }
  }

  openUTRPredictor(): void {
    this.showCalculator.set(true);
    // Scroll to calculator
    setTimeout(() => {
      const calculatorElement = document.querySelector('.calculator-overlay');
      if (calculatorElement) {
        calculatorElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  closeUTRPredictor(): void {
    this.showCalculator.set(false);
    this.resetForm();
  }

  calculateFutureRating(): void {
    const opponentRatingValue = this.opponentRating();
    const setScoresValue = this.setScores();
    
    if (!opponentRatingValue || !setScoresValue) {
      return;
    }

    this.calculating.set(true);
    this.calculationResults.set(null);

    try {
      // Parse set scores
      const setScores = setScoresValue.split(',').map(score => score.trim());
      let playerGamesWon = 0;
      let opponentGamesWon = 0;
      
      setScores.forEach(score => {
        if (score.includes('-')) {
          const [playerScore, oppScore] = score.split('-').map(s => parseInt(s.trim()));
          if (!isNaN(playerScore) && !isNaN(oppScore)) {
            playerGamesWon += playerScore;
            opponentGamesWon += oppScore;
          }
        }
      });
      
      const totalNewGames = playerGamesWon + opponentGamesWon;
      
      if (totalNewGames === 0) {
        throw new Error('Invalid set scores format');
      }
      
      // Calculate expected result
      const currentRatingValue = this.currentRating();
      const slope = -25;
      const intercept = 50 - (slope * currentRatingValue);
      const expectedResult = (slope * opponentRatingValue) + intercept;
      
      // Calculate match rating
      const actualResult = playerGamesWon / totalNewGames;
      const matchRating = opponentRatingValue + 4 * (actualResult - 0.5);
      
      // Calculate future rating
      const totalHistoricalGames = this.matchData().reduce((sum, match) => sum + match.totalGames, 0);
      const futureRating = (currentRatingValue * totalHistoricalGames + matchRating * totalNewGames) / (totalHistoricalGames + totalNewGames);
      
      this.calculationResults.set({
        expectedResult,
        actualResult: actualResult * 100,
        matchRating,
        futureRating,
        ratingChange: futureRating - currentRatingValue,
        performedBetter: actualResult > (expectedResult / 100)
      });
      
    } catch (error) {
      console.error('Error calculating rating:', error);
    } finally {
      this.calculating.set(false);
    }
  }

  resetForm(): void {
    this.opponentRating.set(null);
    this.setScores.set('');
    this.calculationResults.set(null);
  }
}
