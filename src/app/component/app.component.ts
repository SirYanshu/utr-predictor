import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { signal, computed } from '@angular/core';


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
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  // Using Angular signals for reactive state management
  matchData = signal<Match[]>([]);
  currentRating = signal<number>(0);
  uploadStatus = signal<string>('');
  uploadStatusType = signal<'success' | 'error' | 'loading' | ''>('');
  showMatchHistory = signal<boolean>(false);
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

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'text/html') {
      this.handleFileUpload(file);
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0 && files[0].type === 'text/html') {
      this.handleFileUpload(files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private handleFileUpload(file: File): void {
    this.uploadStatus.set('Processing file...');
    this.uploadStatusType.set('loading');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const htmlContent = e.target?.result as string;
        const parsedData = this.parseHtmlContent(htmlContent);
        this.matchData.set(parsedData);
        
        if (parsedData.length > 0) {
          this.uploadStatus.set(`Successfully loaded ${parsedData.length} matches!`);
          this.uploadStatusType.set('success');
          this.showMatchHistory.set(true);
          this.showCalculator.set(true);
          this.calculateCurrentRating();
        } else {
          this.uploadStatus.set('No match data found in the uploaded file.');
          this.uploadStatusType.set('error');
        }
      } catch (error) {
        this.uploadStatus.set(`Error processing file: ${error}`);
        this.uploadStatusType.set('error');
      }
    };
    reader.readAsText(file);
  }

  private parseHtmlContent(htmlContent: string): Match[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const scoreCards = doc.querySelectorAll('div.score-card');
    
    const matches: any[] = [];
    
    scoreCards.forEach(card => {
      try {
        const dateElement = card.querySelector('span.scorecard__dateTimeText__1n0hM');
        const teamDivs = card.querySelectorAll('div.team.aic');
        
        if (!dateElement || teamDivs.length < 2) return;
        
        const dateText = dateElement.textContent?.trim() || '';
        const dateParts = dateText.split('|');
        let matchDate: string;
        
        if (dateParts.length >= 2) {
          const timePart = dateParts[0].trim();
          const datePart = dateParts[1].trim();
          matchDate = `${datePart} ${timePart}`;
        } else {
          matchDate = dateText;
        }
        
        const players: any[] = [];
        teamDivs.forEach(teamDiv => {
          const playerNameElement = teamDiv.querySelector('a.player-name');
          const utrElement = teamDiv.querySelector('div.utr');
          const scoresContainer = teamDiv.querySelectorAll('div.scores-conatiner');
          
          if (playerNameElement && utrElement) {
            const playerName = playerNameElement.textContent?.trim() || '';
            const utr = utrElement.textContent?.trim() || '0';
            
            const gameScores: string[] = [];
            scoresContainer.forEach(container => {
              const scoreItems = container.querySelectorAll('div.score-item');
              scoreItems.forEach(item => {
                let score = item.textContent?.trim() || '';
                if (score.length > 1) {
                  score = score[0];
                }
                gameScores.push(score);
              });
            });
            
            players.push({
              name: playerName,
              utr: parseFloat(utr),
              scores: gameScores
            });
          }
        });
        
        if (players.length === 2) {
          matches.push({
            date: matchDate,
            player1: players[0],
            player2: players[1]
          });
        }
      } catch (error) {
        console.error('Error parsing match:', error);
      }
    });
    
    return this.processMatches(matches);
  }

  private processMatches(rawMatches: any[]): Match[] {
    const processedMatches: Match[] = [];
    
    rawMatches.forEach(match => {
      try {
        const timestamp = this.parseMatchDate(match.date);
        
        let player1GamesWon = 0;
        let player2GamesWon = 0;
        
        if (match.player1.scores && match.player2.scores) {
          for (let i = 0; i < Math.min(match.player1.scores.length, match.player2.scores.length); i++) {
            const p1Score = parseInt(match.player1.scores[i]);
            const p2Score = parseInt(match.player2.scores[i]);
            
            if (!isNaN(p1Score) && !isNaN(p2Score)) {
              if (p1Score + p2Score === 1) {
                player1GamesWon += p1Score * 2;
                player2GamesWon += p2Score * 2;
              } else {
                player1GamesWon += p1Score;
                player2GamesWon += p2Score;
              }
            }
          }
        }
        
        const totalGames = player1GamesWon + player2GamesWon;
        if (totalGames > 0) {
          processedMatches.push({
            datetime: timestamp,
            playerName: match.player1.name,
            opponentName: match.player2.name,
            playerUTR: match.player1.utr,
            opponentUTR: match.player2.utr,
            playerGamesWon: player1GamesWon,
            opponentGamesWon: player2GamesWon,
            totalGames: totalGames,
            winPercentage: (player1GamesWon / totalGames * 100).toFixed(1)
          });
        }
      } catch (error) {
        console.error('Error processing match:', error);
      }
    });
    
    return processedMatches.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
  }

  private parseMatchDate(dateString: string): Date {
    try {
      const today = new Date();
      const parts = dateString.split(' ');
      
      if (parts.length >= 3) {
        const month = parts[0];
        const day = parseInt(parts[1]);
        const time = parts.slice(2).join(' ');
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = monthNames.indexOf(month);
        
        if (monthIndex !== -1) {
          let year = today.getFullYear();
          
          const testDate = new Date(year, monthIndex, day);
          if (testDate > today) {
            year -= 1;
          }
          
          const dateStr = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${time}`;
          return new Date(dateStr);
        }
      }
      
      return new Date(dateString);
    } catch (error) {
      return new Date();
    }
  }

  private calculateCurrentRating(): void {
    const matches = this.matchData();
    if (matches.length > 0) {
      const rating = matches.reduce((sum, match) => sum + match.playerUTR, 0) / matches.length;
      this.currentRating.set(rating);
    }
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
