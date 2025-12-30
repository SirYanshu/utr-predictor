import { Component, Input, signal, computed, OnInit, PLATFORM_ID, Inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

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

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  requirement: string;
  unlocked: boolean;
}

interface WrappedStats {
    year: number;
    totalMatches: number;
    wins: number;
    losses: number;
    winRate: number;
    totalGamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    longestWinStreak: number;
    longestLossStreak: number;
    biggestUpset: Match | null;
    topUpsets: { opponentName: string; opponentUTR: number; utrDiff: number }[];
    biggestLoss: Match | null;
    topLosses: { opponentName: string; opponentUTR: number; utrDiff: number }[];
    closestMatch: Match | null;
    mostDominantWin: Match | null;
    toughestLoss: Match | null;
    mostFrequentOpponent: { name: string; matches: number; wins: number; losses: number; gamesWon: number; gamesLost: number; avgUTR: number } | null;
    topRivalries: { name: string; matches: number; wins: number; losses: number; gamesWon: number; gamesLost: number; avgUTR: number }[];
    avgOpponentUTR: number;
    ratingChange: number;
    startRating: number;
    endRating: number;
    peakRating: number;
    lowestRating: number;
    monthlyStats: { month: string; wins: number; losses: number; winRate: number; startRating: number; endRating: number; ratingChange: number }[];
    weekdayStats: { day: string; wins: number; losses: number; matches: number }[];
    ratingProgression: { month: string; rating: number }[];
    opponentRatingDistribution: { range: string; count: number; wins: number; losses: number }[];
    achievements: Achievement[];
  }


@Component({
  selector: 'app-tennis-wrapped',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wrapped-overlay" *ngIf="isOpen()" (click)="close()">
      <div class="wrapped-page" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="wrapped-header">
          <button class="close-btn" (click)="close()">✕</button>
          <h1 class="page-title">🎾 Tennis Wrapped {{ stats().year }}</h1>
          <p class="page-subtitle">Your year in tennis</p>
        </div>

        <!-- Scrollable Content -->
        <div class="wrapped-content">
          
          <!-- Section 1: Overview -->
          <section class="stat-section overview-section">
            <h2 class="section-title">Overview</h2>
            <div class="overview-grid">
              <div class="stat-card huge">
                <div class="stat-value">{{ stats().totalMatches }}</div>
                <div class="stat-label">Matches Played</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ stats().winRate.toFixed(1) }}%</div>
                <div class="stat-label">Win Rate</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ stats().wins }}</div>
                <div class="stat-label">Wins</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ stats().losses }}</div>
                <div class="stat-label">Losses</div>
              </div>
            </div>
            
            <div class="win-loss-visual">
              <div class="wins-portion" [style.width.%]="stats().winRate">
                {{ stats().wins }}W
              </div>
              <div class="losses-portion" [style.width.%]="100 - stats().winRate">
                {{ stats().losses }}L
              </div>
            </div>
            
            <!-- Games Won/Lost Bar -->
            <div class="stat-detail">Games</div>
            <div class="win-loss-visual">
              <div class="wins-portion" [style.width.%]="(stats().gamesWon / (stats().gamesWon + stats().gamesLost)) * 100">
                {{ stats().gamesWon }}W
              </div>
              <div class="losses-portion" [style.width.%]="(stats().gamesLost / (stats().gamesWon + stats().gamesLost)) * 100">
                {{ stats().gamesLost }}L
              </div>
            </div>
            
            <div class="stat-detail">{{ stats().totalGamesPlayed }} total games played</div>
          </section>

          <!-- Section 2: Performance Highlights -->
          <section class="stat-section">
            <h2 class="section-title">Performance Highlights</h2>
            <div class="highlights-grid">
              <div class="highlight-card">
                <div class="highlight-icon">🔥</div>
                <div class="highlight-value">{{ stats().longestWinStreak }}</div>
                <div class="highlight-label">Longest Win Streak</div>
              </div>
              <div class="highlight-card">
                <div class="highlight-icon">💪</div>
                <div class="highlight-value">{{ stats().avgOpponentUTR.toFixed(2) }}</div>
                <div class="highlight-label">Avg Opponent UTR</div>
              </div>
            </div>
          </section>

          <!-- Section 3: Rating Journey -->
          <section class="stat-section">
            <h2 class="section-title">Rating Journey</h2>
            <div class="rating-journey-grid">
              <div class="rating-card">
                <div class="rating-label">Started</div>
                <div class="rating-value">{{ stats().startRating.toFixed(2) }}</div>
              </div>
              <div class="rating-card peak">
                <div class="rating-label">Peak</div>
                <div class="rating-value">{{ stats().peakRating.toFixed(2) }}</div>
                <div class="peak-badge">👑</div>
              </div>
              <div class="rating-card">
                <div class="rating-label">Current</div>
                <div class="rating-value">{{ stats().endRating.toFixed(2) }}</div>
              </div>
            </div>
            
            <div class="rating-change-card" [class.positive]="stats().ratingChange >= 0" [class.negative]="stats().ratingChange < 0">
              <div class="change-label">Total Change</div>
              <div class="change-value">
                {{ stats().ratingChange >= 0 ? '+' : '' }}{{ stats().ratingChange.toFixed(2) }}
              </div>
            </div>
          </section>

          <!-- Section 4: Rating Progression Graph -->
          <section class="stat-section">
            <h2 class="section-title">Rating Over Time</h2>
            <div class="interactive-graph">
              <div class="graph-container" 
                   (mousemove)="onGraphMouseMove($event)"
                   (mouseleave)="onGraphMouseLeave()"
                   #graphContainer>
                <canvas #ratingCanvas 
                        width="800" 
                        height="400"
                        class="rating-canvas"></canvas>
                
                <!-- Hover tooltip -->
                <div class="graph-tooltip" 
                     *ngIf="hoveredPoint()"
                     [style.left.px]="tooltipPosition().x"
                     [style.top.px]="tooltipPosition().y">
                  <div class="tooltip-date">{{ hoveredPoint()!.month }}</div>
                  <div class="tooltip-rating">{{ hoveredPoint()!.rating.toFixed(2) }} UTR</div>
                </div>
              </div>
              
              <!-- Graph controls -->
              <div class="graph-controls">
                <button class="graph-btn" 
                        [class.active]="graphTimeRange() === 'all'"
                        (click)="setGraphTimeRange('all')">
                  All Time
                </button>
                <button class="graph-btn"
                        [class.active]="graphTimeRange() === '6m'"
                        (click)="setGraphTimeRange('6m')">
                  6 Months
                </button>
                <button class="graph-btn"
                        [class.active]="graphTimeRange() === '3m'"
                        (click)="setGraphTimeRange('3m')">
                  3 Months
                </button>
              </div>
              
              <!-- Stats summary -->
              <div class="graph-stats">
                <div class="graph-stat-item">
                  <span class="graph-stat-label">Lowest</span>
                  <span class="graph-stat-value">{{ stats().lowestRating.toFixed(2) }}</span>
                </div>
                <div class="graph-stat-item">
                  <span class="graph-stat-label">Peak</span>
                  <span class="graph-stat-value highlight">{{ stats().peakRating.toFixed(2) }}</span>
                </div>
                <div class="graph-stat-item">
                  <span class="graph-stat-label">Current</span>
                  <span class="graph-stat-value">{{ stats().endRating.toFixed(2) }}</span>
                </div>
                <div class="graph-stat-item">
                  <span class="graph-stat-label">Change</span>
                  <span class="graph-stat-value" 
                        [class.positive]="stats().ratingChange >= 0"
                        [class.negative]="stats().ratingChange < 0">
                    {{ stats().ratingChange >= 0 ? '+' : '' }}{{ stats().ratingChange.toFixed(2) }}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <!-- Section 5: Biggest Upset -->
          <section class="stat-section" *ngIf="stats().biggestUpset">
            <h2 class="section-title">🏆 Biggest Upset</h2>
            <div class="match-card upset-card">
              <div class="match-opponent">vs {{ stats().biggestUpset!.opponentName }}</div>
              <div class="match-ratings">
                <div class="match-rating you">
                  <div class="rating-label">You</div>
                  <div class="rating-value">{{ stats().biggestUpset!.playerUTR.toFixed(2) }}</div>
                </div>
                <div class="vs">VS</div>
                <div class="match-rating them">
                  <div class="rating-label">Them</div>
                  <div class="rating-value highlight">{{ stats().biggestUpset!.opponentUTR.toFixed(2) }}</div>
                </div>
              </div>
              <div class="match-score" *ngIf="stats().biggestUpset!.setScores">
                {{ stats().biggestUpset!.setScores }}
              </div>
              <div class="match-detail">
                +{{ (stats().biggestUpset!.opponentUTR - stats().biggestUpset!.playerUTR).toFixed(2) }} UTR difference
              </div>
            </div>
            
            <!-- Other Notable Upsets -->
            <div *ngIf="stats().topUpsets.length > 0" class="other-upsets">
              <h3 class="other-upsets-title">Other Notable Upsets</h3>
              <div class="upset-list">
                <div *ngFor="let upset of stats().topUpsets" class="upset-item">
                  <div class="upset-opponent">vs {{ upset.opponentName }}</div>
                  <div class="upset-stats">
                    <span class="upset-rating">{{ upset.opponentUTR.toFixed(2) }} UTR</span>
                    <span class="upset-diff">+{{ upset.utrDiff.toFixed(2) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Section 5.5: Biggest Loss -->
          <section class="stat-section" *ngIf="stats().biggestLoss">
            <h2 class="section-title">💔 Toughest Pill to Swallow</h2>
            <div class="match-card loss-card">
              <div class="match-opponent">vs {{ stats().biggestLoss!.opponentName }}</div>
              <div class="match-ratings">
                <div class="match-rating you">
                  <div class="rating-label">You</div>
                  <div class="rating-value highlight">{{ stats().biggestLoss!.playerUTR.toFixed(2) }}</div>
                </div>
                <div class="vs">VS</div>
                <div class="match-rating them">
                  <div class="rating-label">Them</div>
                  <div class="rating-value">{{ stats().biggestLoss!.opponentUTR.toFixed(2) }}</div>
                </div>
              </div>
              <div class="match-score" *ngIf="stats().biggestLoss!.setScores">
                {{ stats().biggestLoss!.setScores }}
              </div>
              <div class="match-detail">
                -{{ (stats().biggestLoss!.playerUTR - stats().biggestLoss!.opponentUTR).toFixed(2) }} UTR difference
              </div>
            </div>
            
            <!-- Other Notable Losses -->
            <div *ngIf="stats().topLosses.length > 0" class="other-upsets">
              <h3 class="other-upsets-title">Other Tough Losses</h3>
              <div class="upset-list">
                <div *ngFor="let loss of stats().topLosses" class="upset-item">
                  <div class="upset-opponent">vs {{ loss.opponentName }}</div>
                  <div class="upset-stats">
                    <span class="upset-rating">{{ loss.opponentUTR.toFixed(2) }} UTR</span>
                    <span class="loss-diff">-{{ loss.utrDiff.toFixed(2) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Section 7: Tennis Rival -->
          <section class="stat-section" *ngIf="stats().mostFrequentOpponent">
            <h2 class="section-title">Your Tennis Rival</h2>
            <div class="rival-card">
              <div class="rival-name">{{ stats().mostFrequentOpponent!.name }} <span class="rival-utr">({{ stats().mostFrequentOpponent!.avgUTR.toFixed(2) }} UTR)</span></div>
              <div class="rival-matches-count">{{ stats().mostFrequentOpponent!.matches }} matches played</div>
              <div class="rival-record">
                <div class="rival-detail-label">Matches</div>
                <div class="record-bar">
                  <div class="record-wins" 
                       [style.width.%]="(stats().mostFrequentOpponent!.wins / stats().mostFrequentOpponent!.matches) * 100">
                    {{ stats().mostFrequentOpponent!.wins }}W
                  </div>
                  <div class="record-losses" 
                       [style.width.%]="(stats().mostFrequentOpponent!.losses / stats().mostFrequentOpponent!.matches) * 100">
                    {{ stats().mostFrequentOpponent!.losses }}L
                  </div>
                </div>
                
                <div class="rival-detail-label">Games</div>
                <div class="record-bar">
                  <div class="record-wins" 
                       [style.width.%]="(stats().mostFrequentOpponent!.gamesWon / (stats().mostFrequentOpponent!.gamesWon + stats().mostFrequentOpponent!.gamesLost)) * 100">
                    {{ stats().mostFrequentOpponent!.gamesWon }}W
                  </div>
                  <div class="record-losses" 
                       [style.width.%]="(stats().mostFrequentOpponent!.gamesLost / (stats().mostFrequentOpponent!.gamesWon + stats().mostFrequentOpponent!.gamesLost)) * 100">
                    {{ stats().mostFrequentOpponent!.gamesLost }}L
                  </div>
                </div>
              </div>
              <div class="rival-detail">Your biggest rivalry! 🤝</div>
            </div>

            <!-- Other Top Rivalries -->
            <div *ngIf="stats().topRivalries.length > 0" class="other-rivalries">
              <h3 class="other-rivalries-title">Other Notable Rivalries</h3>
              <div class="rivalry-list">
                <div *ngFor="let rival of stats().topRivalries" class="rivalry-item">
                  <div class="rivalry-header">
                    <div class="rivalry-opponent">{{ rival.name }} <span class="rivalry-utr">({{ rival.avgUTR.toFixed(2) }} UTR)</span></div>
                    <div class="rivalry-matches">{{ rival.matches }} matches</div>
                  </div>
                  <div class="rivalry-bars">
                    <div class="rivalry-bar-label">Matches</div>
                    <div class="mini-record-bar">
                      <div class="mini-record-wins" 
                           [style.width.%]="(rival.wins / rival.matches) * 100">
                        {{ rival.wins }}W
                      </div>
                      <div class="mini-record-losses" 
                           [style.width.%]="(rival.losses / rival.matches) * 100">
                        {{ rival.losses }}L
                      </div>
                    </div>
                    <div class="rivalry-bar-label">Games</div>
                    <div class="mini-record-bar">
                      <div class="mini-record-wins" 
                           [style.width.%]="(rival.gamesWon / (rival.gamesWon + rival.gamesLost)) * 100">
                        {{ rival.gamesWon }}W
                      </div>
                      <div class="mini-record-losses" 
                           [style.width.%]="(rival.gamesLost / (rival.gamesWon + rival.gamesLost)) * 100">
                        {{ rival.gamesLost }}L
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Section 8: Monthly Performance -->
          <section class="stat-section">
            <h2 class="section-title">Monthly Performance</h2>
            <div class="monthly-chart-interactive">
              <div class="monthly-chart-container" 
                  (mousemove)="onMonthlyMouseMove($event)"
                  (mouseleave)="onMonthlyMouseLeave()"
                  #monthlyContainer>
                <canvas #monthlyCanvas 
                        width="1000" 
                        height="400"
                        class="monthly-canvas"></canvas>
                
                <!-- Hover tooltip -->
                <div class="monthly-tooltip" 
                    *ngIf="hoveredMonth()"
                    [style.left.px]="monthTooltipPosition().x"
                    [style.top.px]="monthTooltipPosition().y">
                  <div class="tooltip-month">{{ hoveredMonth()!.month }}</div>
                  <div class="tooltip-record">{{ hoveredMonth()!.wins }}W - {{ hoveredMonth()!.losses }}L</div>
                  <div class="tooltip-winrate">{{ hoveredMonth()!.winRate.toFixed(0) }}% Win Rate</div>
                  <div class="tooltip-rating" [class.positive]="hoveredMonth()!.ratingChange >= 0">
                    {{ hoveredMonth()!.ratingChange >= 0 ? '+' : '' }}{{ hoveredMonth()!.ratingChange.toFixed(2) }} Rating
                  </div>
                </div>
              </div>
              
              <div class="monthly-legend">
                <span class="legend-item"><span class="legend-dot wins-up"></span> Wins</span>
                <span class="legend-item"><span class="legend-dot losses-down"></span> Losses</span>
                <span class="legend-item"><span class="legend-line rating-line"></span> Rating</span>
              </div>
            </div>
          </section>

          <!-- Section 9: Weekday Performance -->
          <section class="stat-section">
            <h2 class="section-title">Best Days to Play</h2>
            <div class="weekday-list">
              <div *ngFor="let day of stats().weekdayStats" class="weekday-item">
                <div class="weekday-name">{{ day.day }}</div>
                <div class="weekday-bar-container">
                  <div class="weekday-bar" 
                       [style.width.%]="day.matches > 0 ? (day.wins / day.matches) * 100 : 0">
                  </div>
                </div>
                <div class="weekday-stats">
                  {{ day.wins }}W - {{ day.losses }}L
                  <span *ngIf="day.matches > 0">({{ ((day.wins / day.matches) * 100).toFixed(0) }}%)</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Section 10: Opponent Distribution -->
          <section class="stat-section">
            <h2 class="section-title">Opponent Ratings</h2>
            <div class="distribution-chart">
              <div *ngFor="let bucket of stats().opponentRatingDistribution" class="dist-item">
                <div class="dist-bar-container">
                  <!-- Single stacked bar with both sections -->
                  <div class="dist-bar-stacked" [style.height.%]="getDistHeight(bucket.count)">
                    <!-- Wins portion at bottom -->
                    <div class="dist-bar-wins-portion" 
                        [style.height.%]="bucket.count > 0 ? (bucket.wins / bucket.count) * 100 : 0"
                        [title]="bucket.wins + ' wins'">
                      <span class="dist-count" *ngIf="bucket.wins > 0">{{ bucket.wins }}</span>
                    </div>
                    <!-- Losses portion at top -->
                    <div class="dist-bar-losses-portion" 
                        [style.height.%]="bucket.count > 0 ? (bucket.losses / bucket.count) * 100 : 0"
                        [title]="bucket.losses + ' losses'">
                      <span class="dist-count" *ngIf="bucket.losses > 0">{{ bucket.losses }}</span>
                    </div>
                  </div>
                </div>
                <div class="dist-label">{{ bucket.range }}</div>
              </div>
            </div>
            
            <!-- Legend -->
            <div class="distribution-legend">
              <span class="legend-item"><span class="legend-dot wins"></span> Wins</span>
              <span class="legend-item"><span class="legend-dot losses"></span> Losses</span>
            </div>
          </section>

          <!-- Section 11: Achievements -->
          <section class="stat-section">
            <h2 class="section-title">Achievements</h2>
            <div class="achievements-list">
              <div *ngFor="let achievement of stats().achievements" 
                  class="achievement-item" 
                  [class.locked]="!achievement.unlocked"
                  [title]="achievement.unlocked ? achievement.description : achievement.requirement">
                <div class="achievement-icon">{{ achievement.icon }}</div>
                <div class="achievement-title">{{ achievement.title }}</div>
                
                <!-- Tooltip on hover -->
                <div class="achievement-tooltip">
                  <div class="tooltip-title">{{ achievement.title }}</div>
                  <div class="tooltip-description">{{ achievement.description }}</div>
                  <div class="tooltip-requirement" *ngIf="!achievement.unlocked">
                    🔒 {{ achievement.requirement }}
                  </div>
                  <div class="tooltip-unlocked" *ngIf="achievement.unlocked">
                    ✅ Unlocked!
                  </div>
                </div>
              </div>
            </div>
            
            <div class="achievement-summary">
              {{ unlockedAchievementsCount() }} / {{ totalAchievementsCount() }} Unlocked
            </div>
          </section>

          <!-- Section 12: Share -->
          <section class="stat-section final-section">
            <h2 class="section-title">🎾 That's a Wrap!</h2>
            <p class="final-message">{{ stats().year }} was an incredible year on the court.</p>
            
            <!-- Main Stats Grid -->
            <div class="final-stats-grid">
              <div class="final-stat-card">
                <div class="final-stat-icon">🎾</div>
                <div class="final-stat-value">{{ stats().totalMatches }}</div>
                <div class="final-stat-label">Matches Played</div>
              </div>
              
              <div class="final-stat-card">
                <div class="final-stat-icon">🏆</div>
                <div class="final-stat-value">{{ stats().wins }}</div>
                <div class="final-stat-label">Victories</div>
              </div>
              
              <div class="final-stat-card">
                <div class="final-stat-icon">📊</div>
                <div class="final-stat-value">{{ stats().winRate.toFixed(0) }}%</div>
                <div class="final-stat-label">Win Rate</div>
              </div>
              
              <div class="final-stat-card" *ngIf="stats().ratingChange !== 0">
                <div class="final-stat-icon">{{ stats().ratingChange >= 0 ? '📈' : '📉' }}</div>
                <div class="final-stat-value" [class.positive]="stats().ratingChange >= 0" [class.negative]="stats().ratingChange < 0">
                  {{ stats().ratingChange >= 0 ? '+' : '' }}{{ stats().ratingChange.toFixed(2) }}
                </div>
                <div class="final-stat-label">UTR Change</div>
              </div>
              
              <div class="final-stat-card">
                <div class="final-stat-icon">🎯</div>
                <div class="final-stat-value">{{ stats().totalGamesPlayed }}</div>
                <div class="final-stat-label">Games Played</div>
              </div>
              
              <div class="final-stat-card" *ngIf="stats().longestWinStreak > 0">
                <div class="final-stat-icon">🔥</div>
                <div class="final-stat-value">{{ stats().longestWinStreak }}</div>
                <div class="final-stat-label">Win Streak</div>
              </div>
              
              <div class="final-stat-card">
                <div class="final-stat-icon">⭐</div>
                <div class="final-stat-value">{{ stats().peakRating.toFixed(2) }}</div>
                <div class="final-stat-label">Peak Rating</div>
              </div>
              
              <div class="final-stat-card" *ngIf="stats().biggestUpset">
                <div class="final-stat-icon">🎯</div>
                <div class="final-stat-value">+{{ (stats().biggestUpset!.opponentUTR - stats().biggestUpset!.playerUTR).toFixed(1) }}</div>
                <div class="final-stat-label">Biggest Upset</div>
              </div>
            </div>
            
            <!-- Highlight Stats -->
            <div class="final-highlights">
              <div class="final-highlight" *ngIf="stats().mostFrequentOpponent">
                <span class="highlight-label">Top Rival:</span>
                <span class="highlight-value">{{ stats().mostFrequentOpponent!.name }} ({{ stats().mostFrequentOpponent!.matches }} matches)</span>
              </div>
              <div class="final-highlight">
                <span class="highlight-label">Avg Opponent:</span>
                <span class="highlight-value">{{ stats().avgOpponentUTR.toFixed(2) }} UTR</span>
              </div>
              <div class="final-highlight">
                <span class="highlight-label">Achievements:</span>
                <span class="highlight-value">{{ unlockedAchievementsCount() }} / {{ totalAchievementsCount() }} Unlocked</span>
              </div>
            </div>
            
            <!-- Share Options -->
            <div class="share-section">
              <p class="share-message">Share your Tennis Wrapped</p>
              <div class="share-buttons">
                <button class="share-btn primary" (click)="shareWrapped()">
                  <span class="btn-icon">📤</span>
                  <span class="btn-text">Share Stats</span>
                </button>
                <button class="share-btn secondary" (click)="copyStatsToClipboard()">
                  <span class="btn-icon">📋</span>
                  <span class="btn-text">Copy Text</span>
                </button>
                <button class="share-btn secondary" (click)="downloadImage()">
                  <span class="btn-icon">💾</span>
                  <span class="btn-text">Download Image</span>
                </button>
              </div>
            </div>
            
            <!-- Hashtag -->
            <div class="hashtag">#TennisWrapped{{ stats().year }}</div>
          </section>

        </div>
      </div>
    </div>
  `,
  styleUrls: ['./tennis-wrapped.component.css']
})
export class TennisWrappedComponent implements OnInit, AfterViewInit {
  @Input() matches: Match[] = [];
  @Input() currentRating: number = 0;
  
  @ViewChild('ratingCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('graphContainer') graphContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('monthlyCanvas') monthlyCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('monthlyContainer') monthlyContainerRef!: ElementRef<HTMLDivElement>;

  private isBrowser: boolean;
  private ratingHistoryData: any = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrame: number | null = null;
  
  isOpen = signal(false);
  stats = signal<WrappedStats>(this.calculateEmptyStats());
  
  unlockedAchievementsCount = computed(() => 
    this.stats().achievements.filter(a => a.unlocked).length
  );
  
  totalAchievementsCount = computed(() => 
    this.stats().achievements.length
  );

  hoveredPoint = signal<{ month: string; rating: number } | null>(null);
  tooltipPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  graphTimeRange = signal<'all' | '6m' | '3m'>('all');

  // Monthly chart interaction
  hoveredMonth = signal<{ month: string; wins: number; losses: number; winRate: number; ratingChange: number } | null>(null);
  monthTooltipPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (this.matches.length > 0) {
      this.stats.set(this.calculateStats(this.matches));
    }
  }

  ngAfterViewInit() {
    console.log('ngAfterViewInit called');
  }

  open(ratingHistory?: any) {
    if (ratingHistory) {
      console.log('📊 Received rating history in open():', ratingHistory);
      this.ratingHistoryData = ratingHistory;
    }
    
    this.stats.set(this.calculateStats(this.matches));
    this.isOpen.set(true);
    
    setTimeout(() => {
      // Draw rating graph
      if (this.canvasRef && this.isBrowser) {
        console.log('🎨 Initializing rating canvas...');
        this.ctx = this.canvasRef.nativeElement.getContext('2d');
        console.log('Canvas context:', this.ctx ? 'Ready ✅' : 'Failed ❌');
        
        if (this.ctx) {
          this.drawGraph();
        }
      } else {
        console.log('❌ Canvas ref not available');
      }
      
      // Draw monthly chart
      if (this.monthlyCanvasRef && this.isBrowser) {
        console.log('🎨 Initializing monthly canvas...');
        this.drawMonthlyChart();
      } else {
        console.log('❌ Monthly canvas ref not available');
      }
    }, 150);
  }

  setGraphTimeRange(range: 'all' | '6m' | '3m') {
    this.graphTimeRange.set(range);
    
    if (this.ctx) {
      this.drawGraph();
    } else {
      console.log('⚠️ Canvas not ready yet, skipping draw');
    }
  }

  getFilteredRatingProgression(): { month: string; rating: number }[] {
    const progression = this.stats().ratingProgression;
    const range = this.graphTimeRange();
    
    if (range === 'all') return progression;
    
    const monthsToShow = range === '6m' ? 26 : 13;
    return progression.slice(-monthsToShow);
  }

  drawGraph() {
    if (!this.ctx || !this.canvasRef) {
      console.log('❌ Cannot draw graph: ctx or canvas not ready');
      return;
    }
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = this.ctx;
    const width = canvas.width;
    const height = canvas.height;
    
    console.log('📊 Drawing graph:', { width, height });
    
    ctx.fillStyle = '#1e1e2f';
    ctx.fillRect(0, 0, width, height);
    
    const progression = this.getFilteredRatingProgression();
    console.log('Graph data points:', progression.length);
    
    if (progression.length === 0) {
      console.log('❌ No progression data to draw');
      return;
    }
    
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;
    
    const ratings = progression.map(p => p.rating);
    const minRating = Math.min(...ratings);
    const maxRating = Math.max(...ratings);
    const ratingRange = maxRating - minRating || 1;
    
    console.log('Rating range:', { minRating, maxRating, range: ratingRange });
    
    const rangePadding = ratingRange * 0.1;
    const displayMin = minRating - rangePadding;
    const displayMax = maxRating + rangePadding;
    const displayRange = displayMax - displayMin;
    
    const getX = (index: number) => padding.left + (index / (progression.length - 1)) * graphWidth;
    const getY = (rating: number) => padding.top + graphHeight - ((rating - displayMin) / displayRange) * graphHeight;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      const rating = displayMax - (i / 5) * displayRange;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(rating.toFixed(2), padding.left - 10, y + 5);
    }
    
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(102, 234, 200, 0.4)');
    gradient.addColorStop(1, 'rgba(102, 234, 200, 0.05)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(getX(0), height - padding.bottom);
    progression.forEach((point, i) => {
      ctx.lineTo(getX(i), getY(point.rating));
    });
    ctx.lineTo(getX(progression.length - 1), height - padding.bottom);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#66eac8';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    progression.forEach((point, i) => {
      const x = getX(i);
      const y = getY(point.rating);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    
    console.log('✅ Line drawn');
    
    progression.forEach((point, i) => {
      const x = getX(i);
      const y = getY(point.rating);
      
      ctx.fillStyle = '#66eac8';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    
    console.log('✅ Points drawn');
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    
    const labelInterval = Math.ceil(progression.length / 6);
    progression.forEach((point, i) => {
      if (i % labelInterval === 0 || i === progression.length - 1) {
        const x = getX(i);
        ctx.save();
        ctx.translate(x, height - padding.bottom + 20);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText(point.month, 0, 0);
        ctx.restore();
      }
    });
    
    console.log('✅ Labels drawn');
  }

  onGraphMouseMove(event: MouseEvent) {
    if (!this.canvasRef || !this.graphContainerRef) return;
    
    const canvas = this.canvasRef.nativeElement;
    const container = this.graphContainerRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    const progression = this.getFilteredRatingProgression();
    if (progression.length === 0) return;
    
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    const graphWidth = canvas.width - padding.left - padding.right;
    
    const getPointX = (index: number) => padding.left + (index / (progression.length - 1)) * graphWidth;
    
    let closestIndex = 0;
    let closestDistance = Infinity;
    
    progression.forEach((point, i) => {
      const pointX = getPointX(i);
      const distance = Math.abs(x - pointX);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    });
    
    if (closestDistance < 30) {
      this.hoveredPoint.set(progression[closestIndex]);
      
      const containerRect = container.getBoundingClientRect();
      this.tooltipPosition.set({
        x: event.clientX - containerRect.left,
        y: event.clientY - containerRect.top - 60
      });
      
      this.drawGraphWithHighlight(closestIndex);
    } else {
      this.hoveredPoint.set(null);
      this.drawGraph();
    }
  }

  onGraphMouseLeave() {
    this.hoveredPoint.set(null);
    this.drawGraph();
  }

  drawGraphWithHighlight(highlightIndex: number) {
    this.drawGraph();
    
    if (!this.ctx || !this.canvasRef) return;
    
    const canvas = this.canvasRef.nativeElement;
    const ctx = this.ctx;
    const progression = this.getFilteredRatingProgression();
    
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    const graphWidth = canvas.width - padding.left - padding.right;
    const graphHeight = canvas.height - padding.top - padding.bottom;
    
    const ratings = progression.map(p => p.rating);
    const minRating = Math.min(...ratings);
    const maxRating = Math.max(...ratings);
    const ratingRange = maxRating - minRating || 1;
    const rangePadding = ratingRange * 0.1;
    const displayMin = minRating - rangePadding;
    const displayMax = maxRating + rangePadding;
    const displayRange = displayMax - displayMin;
    
    const getX = (index: number) => padding.left + (index / (progression.length - 1)) * graphWidth;
    const getY = (rating: number) => padding.top + graphHeight - ((rating - displayMin) / displayRange) * graphHeight;
    
    const point = progression[highlightIndex];
    const x = getX(highlightIndex);
    const y = getY(point.rating);
    
    ctx.shadowColor = '#667eea';
    ctx.shadowBlur = 20;
    
    ctx.fillStyle = '#667eea';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, canvas.height - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  close() {
    this.isOpen.set(false);
  }

  getMonthBarHeight(wins: number, losses: number, value: number): number {
    const maxTotal = Math.max(...this.stats().monthlyStats.map(m => m.wins + m.losses));
    if (maxTotal === 0) return 0;
    return (value / maxTotal) * 100;
  }

  getDistHeight(count: number): number {
    const maxCount = Math.max(...this.stats().opponentRatingDistribution.map(d => d.count));
    if (maxCount === 0) return 0;
    return (count / maxCount) * 100;
  }

  drawMonthlyChart() {
    if (!this.monthlyCanvasRef || !this.isBrowser) return;
    
    const canvas = this.monthlyCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const stats = this.stats().monthlyStats;
    if (stats.length === 0) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    
    // Clear canvas
    ctx.fillStyle = '#f8f9ff';
    ctx.fillRect(0, 0, width, height);
    
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const centerY = padding.top + chartHeight / 2;
    
    // Find max values for scaling
    const maxWins = Math.max(...stats.map(s => s.wins));
    const maxLosses = Math.max(...stats.map(s => s.losses));
    const maxMatches = Math.max(maxWins, maxLosses);
    const barHalfHeight = chartHeight / 2 - 20;
    
    // Get rating data from the actual rating progression
    const ratingProgression = this.stats().ratingProgression;
    
    // Map each month to its corresponding rating from history
    const monthRatings = stats.map(monthStat => {
      // Find ratings from history that match this month
      const matchingRatings = ratingProgression.filter(point => 
        point.month.startsWith(monthStat.month)
      );
      
      // Use the last rating of the month if available, otherwise use endRating from matches
      if (matchingRatings.length > 0) {
        return matchingRatings[matchingRatings.length - 1].rating;
      }
      return monthStat.endRating;
    });
    
    console.log('📊 Monthly stats:', stats.map(s => s.month));
    console.log('📈 Month ratings:', monthRatings);
    
    // Rating range
    const minRating = Math.min(...monthRatings);
    const maxRating = Math.max(...monthRatings);
    const ratingRange = maxRating - minRating || 1;
    
    console.log('📈 Rating range for monthly chart:', { minRating, maxRating, ratingRange });
    
    // Draw center line
    ctx.strokeStyle = '#cbd5e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, centerY);
    ctx.lineTo(width - padding.right, centerY);
    ctx.stroke();
    
    // Draw bars and rating line
    const barWidth = chartWidth / stats.length * 0.6;
    const spacing = chartWidth / stats.length;
    
    // Draw bars first
    stats.forEach((month, i) => {
      const x = padding.left + spacing * i + spacing / 2;
      
      // Wins bar (upward)
      const winsHeight = (month.wins / maxMatches) * barHalfHeight;
      const winsGradient = ctx.createLinearGradient(x, centerY - winsHeight, x, centerY);
      winsGradient.addColorStop(0, '#48bb78');
      winsGradient.addColorStop(1, '#68d391');
      
      ctx.fillStyle = winsGradient;
      ctx.fillRect(x - barWidth / 2, centerY - winsHeight, barWidth, winsHeight);
      
      // Losses bar (downward)
      const lossesHeight = (month.losses / maxMatches) * barHalfHeight;
      const lossesGradient = ctx.createLinearGradient(x, centerY, x, centerY + lossesHeight);
      lossesGradient.addColorStop(0, '#f56565');
      lossesGradient.addColorStop(1, '#fc8181');
      
      ctx.fillStyle = lossesGradient;
      ctx.fillRect(x - barWidth / 2, centerY, barWidth, lossesHeight);
    });
    
    // Draw rating line using the mapped ratings
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    stats.forEach((month, i) => {
      const x = padding.left + spacing * i + spacing / 2;
      const rating = monthRatings[i];
      const normalizedRating = (rating - minRating) / ratingRange;
      const y = padding.top + chartHeight - (normalizedRating * (chartHeight - 40)) - 20;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    
    // Draw rating points
    stats.forEach((month, i) => {
      const x = padding.left + spacing * i + spacing / 2;
      const rating = monthRatings[i];
      const normalizedRating = (rating - minRating) / ratingRange;
      const y = padding.top + chartHeight - (normalizedRating * (chartHeight - 40)) - 20;
      
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw labels
    ctx.fillStyle = '#4a5568';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    
    stats.forEach((month, i) => {
      const x = padding.left + spacing * i + spacing / 2;
      ctx.fillText(month.month, x, height - padding.bottom + 25);
    });
    
    // Draw axis labels
    ctx.fillStyle = '#2d3748';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('Wins', padding.left - 10, padding.top + 10);
    ctx.fillText('Losses', padding.left - 10, height - padding.bottom - 10);
  }

  onMonthlyMouseMove(event: MouseEvent) {
    if (!this.monthlyCanvasRef || !this.monthlyContainerRef) return;
    
    const canvas = this.monthlyCanvasRef.nativeElement;
    const container = this.monthlyContainerRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const x = (event.clientX - rect.left) * scaleX;
    
    const stats = this.stats().monthlyStats;
    if (stats.length === 0) return;
    
    const padding = { left: 60, right: 40 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const spacing = chartWidth / stats.length;
    
    let closestIndex = -1;
    let closestDistance = Infinity;
    
    stats.forEach((month, i) => {
      const monthX = padding.left + spacing * i + spacing / 2;
      const distance = Math.abs(x - monthX);
      if (distance < closestDistance && distance < spacing / 2) {
        closestDistance = distance;
        closestIndex = i;
      }
    });
    
    if (closestIndex >= 0) {
      const monthStat = stats[closestIndex];
      
      // Get the actual rating from rating progression for this month
      const ratingProgression = this.stats().ratingProgression;
      const matchingRatings = ratingProgression.filter(point => 
        point.month.startsWith(monthStat.month)
      );
      
      // Calculate rating change for this month
      let ratingChange = 0;
      if (matchingRatings.length > 0) {
        const endRating = matchingRatings[matchingRatings.length - 1].rating;
        const startRating = matchingRatings[0].rating;
        ratingChange = endRating - startRating;
      } else {
        // Fallback to match-based rating change
        ratingChange = monthStat.ratingChange;
      }
      
      // If this is not the first month, we can calculate change from previous month
      if (closestIndex > 0) {
        const currentMonthRatings = ratingProgression.filter(point => 
          point.month.startsWith(stats[closestIndex].month)
        );
        const prevMonthRatings = ratingProgression.filter(point => 
          point.month.startsWith(stats[closestIndex - 1].month)
        );
        
        if (currentMonthRatings.length > 0 && prevMonthRatings.length > 0) {
          const currentRating = currentMonthRatings[currentMonthRatings.length - 1].rating;
          const prevRating = prevMonthRatings[prevMonthRatings.length - 1].rating;
          ratingChange = currentRating - prevRating;
        }
      }
      
      this.hoveredMonth.set({
        month: monthStat.month,
        wins: monthStat.wins,
        losses: monthStat.losses,
        winRate: monthStat.winRate,
        ratingChange: ratingChange
      });
      
      const containerRect = container.getBoundingClientRect();
      this.monthTooltipPosition.set({
        x: event.clientX - containerRect.left,
        y: event.clientY - containerRect.top - 100
      });
    } else {
      this.hoveredMonth.set(null);
    }
  }

  onMonthlyMouseLeave() {
    this.hoveredMonth.set(null);
  }

  copyStatsToClipboard(): void {
    if (!this.isBrowser) return;
    
    const text = this.generateShareText();
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('✅ Stats copied to clipboard!');
      }).catch(() => {
        alert('❌ Failed to copy to clipboard');
      });
    } else {
      alert('❌ Clipboard not supported');
    }
  }

  downloadImage(): void {
    if (!this.isBrowser) return;
    
    // For now, just show a message
    // In a full implementation, you would use html2canvas or similar
    alert('📸 Screenshot feature coming soon! For now, take a screenshot of this page to share on Instagram Stories!');
  }

  private generateShareText(): string {
    const stats = this.stats();
    
    let text = `🎾 My Tennis Wrapped ${stats.year} 🎾\n\n`;
    text += `📊 ${stats.totalMatches} matches played\n`;
    text += `🏆 ${stats.wins} wins (${stats.winRate.toFixed(1)}% win rate)\n`;
    text += `🎯 ${stats.totalGamesPlayed} total games\n`;
    
    if (stats.ratingChange !== 0) {
      text += `📈 ${stats.ratingChange >= 0 ? '+' : ''}${stats.ratingChange.toFixed(2)} UTR change\n`;
    }
    
    text += `⭐ ${stats.peakRating.toFixed(2)} peak rating\n`;
    
    if (stats.longestWinStreak > 0) {
      text += `🔥 ${stats.longestWinStreak} match win streak\n`;
    }
    
    if (stats.biggestUpset) {
      text += `🎯 Beat opponent ${(stats.biggestUpset.opponentUTR - stats.biggestUpset.playerUTR).toFixed(1)} UTR above me\n`;
    }
    
    if (stats.mostFrequentOpponent) {
      text += `🤝 Top rival: ${stats.mostFrequentOpponent.name} (${stats.mostFrequentOpponent.matches} matches)\n`;
    }
    
    const unlockedAchievements = stats.achievements.filter(a => a.unlocked).length;
    text += `🏅 ${unlockedAchievements}/${stats.achievements.length} achievements unlocked\n`;
    
    text += `\n#TennisWrapped${stats.year} #Tennis #UTR`;
    
    return text;
  }

  shareWrapped() {
    if (!this.isBrowser) return;
    
    const text = this.generateShareText();
    
    if (navigator.share) {
      navigator.share({ 
        text,
        title: `My Tennis Wrapped ${this.stats().year}`
      }).catch(() => {
        // Fallback to clipboard if share fails
        this.copyStatsToClipboard();
      });
    } else {
      this.copyStatsToClipboard();
    }
  }

  private calculateEmptyStats(): WrappedStats {
    return {
      year: new Date().getFullYear(),
      totalMatches: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalGamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      longestWinStreak: 0,
      longestLossStreak: 0,
      biggestUpset: null,
      topUpsets: [],
      biggestLoss: null,
      topLosses: [],
      closestMatch: null,
      mostDominantWin: null,
      toughestLoss: null,
      mostFrequentOpponent: null,
      topRivalries: [],
      avgOpponentUTR: 0,
      ratingChange: 0,
      startRating: 0,
      endRating: 0,
      peakRating: 0,
      lowestRating: 0,
      monthlyStats: [],
      weekdayStats: [],
      ratingProgression: [],
      opponentRatingDistribution: [],
      achievements: []
    };
  }

  private calculateStats(matches: Match[]): WrappedStats {
    if (matches.length === 0) return this.calculateEmptyStats();

    const year = new Date().getFullYear();
    const yearMatches = matches.filter(m => m.datetime.getFullYear() === year);
    
    if (yearMatches.length === 0) {
      return this.calculateStatsForMatches(matches, year);
    }
    
    return this.calculateStatsForMatches(yearMatches, year);
  }

  private calculateStatsForMatches(matches: Match[], year: number): WrappedStats {
    const totalMatches = matches.length;
    const wins = matches.filter(m => m.playerGamesWon > m.opponentGamesWon).length;
    const losses = totalMatches - wins;
    const winRate = (wins / totalMatches) * 100;
    const totalGamesPlayed = matches.reduce((sum, m) => sum + m.totalGames, 0);

    const gamesWon = matches.reduce((sum, m) => sum + m.playerGamesWon, 0);
    const gamesLost = matches.reduce((sum, m) => sum + m.opponentGamesWon, 0);

    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    matches.forEach(match => {
      if (match.playerGamesWon > match.opponentGamesWon) {
        currentWinStreak++;
        currentLossStreak = 0;
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
      }
    });

    const allWins = matches
      .filter(match => match.playerGamesWon > match.opponentGamesWon)
      .map(match => ({
        opponent: match.opponentName,
        playerUTR: match.playerUTR,
        opponentUTR: match.opponentUTR,
        diff: match.opponentUTR - match.playerUTR
      }))
      .sort((a, b) => b.diff - a.diff);
    
    console.log('🎾 ALL WINS (sorted by UTR diff):', allWins);
    
    const upsetWins = matches
      .filter(match => match.playerGamesWon > match.opponentGamesWon)
      .map(match => ({
        match,
        utrDiff: match.opponentUTR - match.playerUTR
      }))
      .filter(item => item.utrDiff >= 0.0)
      .sort((a, b) => b.utrDiff - a.utrDiff)
      .slice(0, 5);
    
    console.log('🏆 Upset wins found:', upsetWins.length);
    console.log('🏆 All upsets:', upsetWins.map(u => ({
      opponent: u.match.opponentName,
      diff: u.utrDiff.toFixed(2)
    })));
    
    const biggestUpset = upsetWins.length > 0 ? upsetWins[0].match : null;
    const topUpsets = upsetWins.slice(1, 5).map(item => ({
      opponentName: item.match.opponentName,
      opponentUTR: item.match.opponentUTR,
      utrDiff: item.utrDiff
    }));
    
    console.log('🏆 Biggest upset:', biggestUpset ? biggestUpset.opponentName : 'none');
    console.log('🏆 Top upsets (next 4):', topUpsets);

    const lossesToLowerRated = matches
      .filter(match => match.playerGamesWon < match.opponentGamesWon)
      .map(match => ({
        match,
        utrDiff: match.playerUTR - match.opponentUTR
      }))
      .filter(item => item.utrDiff >= 0.0)
      .sort((a, b) => b.utrDiff - a.utrDiff)
      .slice(0, 5);
    
    console.log('💔 Losses to lower-rated found:', lossesToLowerRated.length);
    
    const biggestLoss = lossesToLowerRated.length > 0 ? lossesToLowerRated[0].match : null;
    const topLosses = lossesToLowerRated.slice(1, 5).map(item => ({
      opponentName: item.match.opponentName,
      opponentUTR: item.match.opponentUTR,
      utrDiff: item.utrDiff
    }));
    
    console.log('💔 Biggest loss:', biggestLoss ? biggestLoss.opponentName : 'none');
    console.log('💔 Top losses (next 4):', topLosses);

    let closestMatch: Match | null = null;
    let minDiff = Infinity;
    matches.forEach(match => {
      const diff = Math.abs(match.playerGamesWon - match.opponentGamesWon);
      if (diff < minDiff && diff <= 2) {
        minDiff = diff;
        closestMatch = match;
      }
    });

    let mostDominantWin: Match | null = null;
    let maxWinMargin = 0;
    matches.forEach(match => {
      if (match.playerGamesWon > match.opponentGamesWon) {
        const margin = match.playerGamesWon - match.opponentGamesWon;
        if (margin > maxWinMargin) {
          maxWinMargin = margin;
          mostDominantWin = match;
        }
      }
    });

    let toughestLoss: Match | null = null;
    let minLossMargin = Infinity;
    matches.forEach(match => {
      if (match.playerGamesWon < match.opponentGamesWon) {
        const margin = match.opponentGamesWon - match.playerGamesWon;
        if (margin < minLossMargin) {
          minLossMargin = margin;
          toughestLoss = match;
        }
      }
    });

    const opponentStats: { [name: string]: { matches: number; wins: number; losses: number; gamesWon: number; gamesLost: number; totalUTR: number; count: number } } = {};
    matches.forEach(match => {
      if (!opponentStats[match.opponentName]) {
        opponentStats[match.opponentName] = { matches: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, totalUTR: 0, count: 0 };
      }
      opponentStats[match.opponentName].matches++;
      opponentStats[match.opponentName].gamesWon += match.playerGamesWon;
      opponentStats[match.opponentName].gamesLost += match.opponentGamesWon;
      opponentStats[match.opponentName].totalUTR += match.opponentUTR;
      opponentStats[match.opponentName].count++;
      if (match.playerGamesWon > match.opponentGamesWon) {
        opponentStats[match.opponentName].wins++;
      } else {
        opponentStats[match.opponentName].losses++;
      }
    });

    const sortedOpponents = Object.entries(opponentStats)
      .map(([name, stats]) => ({ 
        name, 
        matches: stats.matches,
        wins: stats.wins,
        losses: stats.losses,
        gamesWon: stats.gamesWon,
        gamesLost: stats.gamesLost,
        avgUTR: stats.totalUTR / stats.count
      }))
      .sort((a, b) => {
        if (b.matches !== a.matches) {
          return b.matches - a.matches;
        }
        const aTotalGames = a.gamesWon + a.gamesLost;
        const bTotalGames = b.gamesWon + b.gamesLost;
        return bTotalGames - aTotalGames;
      });
        
    const mostFrequentOpponent = sortedOpponents.length > 0 && sortedOpponents[0].matches >= 1 
      ? sortedOpponents[0] 
      : null;
    
    const topRivalries = sortedOpponents
      .slice(1, 6)
      .filter(rival => rival.matches >= 1);
    
    console.log('🤝 Top rivalries:', topRivalries);

    const avgOpponentUTR = matches.reduce((sum, m) => sum + m.opponentUTR, 0) / totalMatches;

    // Group matches by month with rating tracking
    const monthlyData: { [key: string]: { wins: number; losses: number; matches: Match[] } } = {};
    matches.forEach(match => {
      const month = match.datetime.toLocaleString('default', { month: 'short' });
      if (!monthlyData[month]) {
        monthlyData[month] = { wins: 0, losses: 0, matches: [] };
      }
      monthlyData[month].matches.push(match);
      if (match.playerGamesWon > match.opponentGamesWon) {
        monthlyData[month].wins++;
      } else {
        monthlyData[month].losses++;
      }
    });

    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyStats = monthOrder
      .filter(month => monthlyData[month])
      .map(month => {
        const data = monthlyData[month];
        const total = data.wins + data.losses;
        const sortedMatches = data.matches.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
        const startRating = sortedMatches[0]?.playerUTR || 0;
        const endRating = sortedMatches[sortedMatches.length - 1]?.playerUTR || 0;
        
        return {
          month,
          wins: data.wins,
          losses: data.losses,
          winRate: (data.wins / total) * 100,
          startRating,
          endRating,
          ratingChange: endRating - startRating
        };
      });

    const weekdayData: { [key: string]: { wins: number; losses: number } } = {};
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    matches.forEach(match => {
      const day = weekdays[match.datetime.getDay()];
      if (!weekdayData[day]) {
        weekdayData[day] = { wins: 0, losses: 0 };
      }
      if (match.playerGamesWon > match.opponentGamesWon) {
        weekdayData[day].wins++;
      } else {
        weekdayData[day].losses++;
      }
    });

    const weekdayStats = weekdays.map(day => ({
      day,
      wins: weekdayData[day]?.wins || 0,
      losses: weekdayData[day]?.losses || 0,
      matches: (weekdayData[day]?.wins || 0) + (weekdayData[day]?.losses || 0)
    })).filter(d => d.matches > 0);

    const sortedMatches = [...matches].sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

    let ratingProgression: { month: string; rating: number }[] = [];
    
    if (this.ratingHistoryData) {
      let historyData: any[] = [];
      
      if (this.ratingHistoryData.extendedRatingProfile?.history) {
        historyData = this.ratingHistoryData.extendedRatingProfile.history;
      } else if (this.ratingHistoryData.history) {
        historyData = this.ratingHistoryData.history;
      } else if (Array.isArray(this.ratingHistoryData)) {
        historyData = this.ratingHistoryData;
      }
      
      if (historyData && historyData.length > 0) {
        ratingProgression = historyData
          .filter((point: any) => point && point.rating && point.date)
          .map((point: any) => {
            const date = new Date(point.date);
            const label = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
            
            return { 
              month: label, 
              rating: point.rating
            };
          })
          .reverse();
      }
    }
    
    if (ratingProgression.length === 0) {
      const ratingTimeline: { date: Date; rating: number }[] = sortedMatches.map(match => ({
        date: match.datetime,
        rating: match.playerUTR
      }));

      const weeklyRatings: { [key: string]: number[] } = {};
      ratingTimeline.forEach(point => {
        const weekStart = new Date(point.date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeklyRatings[weekKey]) {
          weeklyRatings[weekKey] = [];
        }
        weeklyRatings[weekKey].push(point.rating);
      });

      ratingProgression = Object.entries(weeklyRatings)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([weekKey, ratings]) => {
          const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          const date = new Date(weekKey);
          const monthDay = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
          return {
            month: monthDay,
            rating: avgRating
          };
        });
    }

    let startRating: number;
    let endRating: number;
    let peakRating: number;
    let lowestRating: number;
    let ratingChange: number;
    
    if (ratingProgression.length > 0) {
      const ratings = ratingProgression.map(p => p.rating);
      
      startRating = ratingProgression[0].rating;
      endRating = ratingProgression[ratingProgression.length - 1].rating;
      peakRating = Math.max(...ratings);
      lowestRating = Math.min(...ratings);
      ratingChange = endRating - startRating;
    } else {
      startRating = sortedMatches[0]?.playerUTR || this.currentRating;
      endRating = sortedMatches[sortedMatches.length - 1]?.playerUTR || this.currentRating;
      peakRating = Math.max(...matches.map(m => m.playerUTR));
      lowestRating = Math.min(...matches.map(m => m.playerUTR));
      ratingChange = endRating - startRating;
    }

    const ratingBuckets = [
      { range: '<2', min: 1, max: 2.0, count: 0, wins: 0, losses: 0 },
      { range: '2-3', min: 2.0, max: 3.0, count: 0, wins: 0, losses: 0 },
      { range: '3-4', min: 3.0, max: 4.0, count: 0, wins: 0, losses: 0 },
      { range: '4-5', min: 4.0, max: 5.0, count: 0, wins: 0, losses: 0 },
      { range: '5-6', min: 5.0, max: 6.0, count: 0, wins: 0, losses: 0 },
      { range: '6-7', min: 6.0, max: 7.0, count: 0, wins: 0, losses: 0 },
      { range: '7-8', min: 7.0, max: 8.0, count: 0, wins: 0, losses: 0 },
      { range: '8-9', min: 8.0, max: 9.0, count: 0, wins: 0, losses: 0 },
      { range: '9-10', min: 9.0, max: 10.0, count: 0, wins: 0, losses: 0 },
      { range: '10-11', min: 10.0, max: 11.0, count: 0, wins: 0, losses: 0 },
      { range: '11-12', min: 11.0, max: 12.0, count: 0, wins: 0, losses: 0 },
      { range: '12-13', min: 12.0, max: 13.0, count: 0, wins: 0, losses: 0 },
      { range: '13-14', min: 13.0, max: 14.0, count: 0, wins: 0, losses: 0 },
      { range: '14-15', min: 14.0, max: 15.0, count: 0, wins: 0, losses: 0 },
      { range: '15-16', min: 15.0, max: 16.0, count: 0, wins: 0, losses: 0 },
      { range: '16+', min: 16.0, max: 100, count: 0, wins: 0, losses: 0 }
    ];

    matches.forEach(match => {
      const bucket = ratingBuckets.find(b => match.opponentUTR >= b.min && match.opponentUTR < b.max);
      if (bucket) {
        bucket.count++;
        if (match.playerGamesWon > match.opponentGamesWon) {
          bucket.wins++;
        } else {
          bucket.losses++;
        }
      }
    });
    
    const opponentRatingDistribution = ratingBuckets
      .filter(b => b.count > 0)
      .map(b => ({ range: b.range, count: b.count, wins: b.wins, losses: b.losses }));

    // Define all possible achievements
    const allAchievements: Achievement[] = [
      {
        id: 'double-digits',
        icon: '🏆',
        title: 'Double Digits',
        description: 'Win 10 or more matches',
        requirement: 'Win 10+ matches',
        unlocked: wins >= 10
      },
      {
        id: 'champion',
        icon: '⭐',
        title: 'Champion',
        description: 'Maintain a 75% or higher win rate',
        requirement: 'Win rate ≥75%',
        unlocked: winRate >= 75
      },
      {
        id: 'on-fire',
        icon: '🔥',
        title: 'On Fire',
        description: 'Achieve a 60% or higher win rate',
        requirement: 'Win rate ≥60%',
        unlocked: winRate >= 60
      },
      {
        id: 'unstoppable',
        icon: '🚀',
        title: 'Unstoppable',
        description: 'Win 5 or more matches in a row',
        requirement: '5+ match win streak',
        unlocked: longestWinStreak >= 5
      },
      {
        id: 'giant-slayer',
        icon: '🎯',
        title: 'Giant Slayer',
        description: 'Defeat an opponent 1.0+ UTR higher',
        requirement: 'Beat opponent 1.0+ UTR above you',
        unlocked: biggestUpset !== null && (biggestUpset.opponentUTR - biggestUpset.playerUTR) >= 1.0
      },
      {
        id: 'grinder',
        icon: '💪',
        title: 'Grinder',
        description: 'Play 50 or more matches',
        requirement: 'Play 50+ matches',
        unlocked: totalMatches >= 50
      },
      {
        id: 'rising-star',
        icon: '📈',
        title: 'Rising Star',
        description: 'Improve your rating by 1.0 or more',
        requirement: 'Rating +1.0 or higher',
        unlocked: ratingChange >= 1.0
      },
      {
        id: 'superstar',
        icon: '🌟',
        title: 'Superstar',
        description: 'Improve your rating by 2.0 or more',
        requirement: 'Rating +2.0 or higher',
        unlocked: ratingChange >= 2.0
      },
      {
        id: 'workhorse',
        icon: '⚡',
        title: 'Workhorse',
        description: 'Play 500 or more total games',
        requirement: 'Play 500+ total games',
        unlocked: totalGamesPlayed >= 500
      },
      {
        id: 'dominator',
        icon: '💥',
        title: 'Dominator',
        description: 'Win a match by 10+ games',
        requirement: 'Win margin of 10+ games',
        unlocked: maxWinMargin >= 10
      },
      {
        id: 'consistency',
        icon: '🎾',
        title: 'Consistency King',
        description: 'Play matches in 10+ different months',
        requirement: 'Play in 10+ months',
        unlocked: monthlyStats.length >= 10
      },
      {
        id: 'weekend-warrior',
        icon: '🏖️',
        title: 'Weekend Warrior',
        description: 'Win 20+ matches on weekends',
        requirement: '20+ weekend wins',
        unlocked: (() => {
          const weekendDays = weekdayStats.filter(d => d.day === 'Sat' || d.day === 'Sun');
          const weekendWins = weekendDays.reduce((sum, d) => sum + d.wins, 0);
          return weekendWins >= 20;
        })()
      }
    ];

    const achievements = allAchievements;
    return {
        year,
        totalMatches,
        wins,
        losses,
        winRate,
        totalGamesPlayed,
        gamesWon,
        gamesLost,
        longestWinStreak,
        longestLossStreak,
        biggestUpset,
        topUpsets,
        biggestLoss,
        topLosses,
        closestMatch,
        mostDominantWin,
        toughestLoss,
        mostFrequentOpponent,
        topRivalries,
        avgOpponentUTR,
        ratingChange,
        startRating,
        endRating,
        peakRating,
        lowestRating,
        monthlyStats,
        weekdayStats,
        ratingProgression,
        opponentRatingDistribution,
        achievements
      };
  }
}
