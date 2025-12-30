import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

interface UTRProfile {
  id: string;
  firstName: string;
  lastName: string;
  singlesUtr: number;
  doublesUtr: number;
  city?: string;
  state?: string;
  gender?: string;
}

interface UTRResult {
  date: string;
  id: number;
  players: {
    winner1: any;
    winner2?: any;
    loser1: any;
    loser2?: any;
  };
  score: {
    [key: string]: {
      winner: number;
      loser: number;
      tiebreak?: number;
    };
  };
  isWinner: boolean;
}

interface UTRResultsResponse {
  wins: number;
  losses: number;
  events: Array<{
    id: number;
    name: string;
    draws: Array<{
      id: number;
      name: string;
      results: UTRResult[];
    }>;
  }>;
}

interface PlayerSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  city?: string;
  state?: string;
  singlesUtr?: number;
  doublesUtr?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UtrApiService {
  // API Configuration
  private readonly BASE_URL = 'https://api.utrsports.net/v4';
  
  // Proxy configuration (optional - for local development)
  private readonly USE_PROXY = true; // Set to true to use proxy
  private readonly PROXY_URL = 'https://utr-proxy-dppa.onrender.com/api';
  
  private tokenSubject = new BehaviorSubject<string | null>(this.getStoredToken());
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get stored JWT token from localStorage
   */
  private getStoredToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('utr_jwt_token');
    }
    return null;
  }

  /**
   * Store JWT token in localStorage
   */
  private storeToken(token: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('utr_jwt_token', token);
      this.tokenSubject.next(token);
    }
  }

  /**
   * Clear JWT token from localStorage
   */
  private clearToken(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('utr_jwt_token');
      this.tokenSubject.next(null);
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.getStoredToken();
  }

  /**
   * Get the base URL (with or without proxy)
   */
  private getBaseUrl(): string {
    return this.USE_PROXY ? this.PROXY_URL : this.BASE_URL;
  }

  /**
   * Create HTTP headers with JWT token
   * Tries multiple authentication methods
   */
  private createHeaders(): HttpHeaders {
    const token = this.getStoredToken();
    let headers = new HttpHeaders({
      'accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json'
    });
    
    if (token) {
      // Method 1: Try Authorization Bearer (standard)
      headers = headers.set('Authorization', `Bearer ${token}`);
      
      // Method 2: Try custom header (will be sent if proxy is used)
      headers = headers.set('X-JWT-Token', token);
      
      // Note: Browser won't allow setting Cookie header directly
      // If using proxy, the proxy should convert X-JWT-Token to Cookie
    }
    
    return headers;
  }

  /**
   * Make HTTP request with credentials
   */
  private makeRequest<T>(url: string, options: any = {}): Observable<T> {
    // Add withCredentials if not using proxy (tries to send cookies)
    const requestOptions: any = {
      ...options,
      headers: this.createHeaders(),
      withCredentials: !this.USE_PROXY // Try to send cookies if not using proxy
    };

    return this.http.get<T>(url, requestOptions) as Observable<T>;
  }

  /**
   * Set token manually (from browser cookies)
   */
  setToken(token: string): void {
    this.storeToken(token);
  }

  /**
   * Logout user
   */
  logout(): void {
    this.clearToken();
  }

  /**
   * Search for a player by name
   */
  searchPlayer(searchTerm: string): Observable<PlayerSearchResult[]> {
    const url = `${this.getBaseUrl()}/search?query=${encodeURIComponent(searchTerm)}&top=10`;
    
    return this.makeRequest<any>(url).pipe(
      map(response => {
        // Handle different possible response structures
        if (Array.isArray(response)) {
          return response;
        } else if (response.players && Array.isArray(response.players)) {
          return response.players;
        } else if (response.results && Array.isArray(response.results)) {
          return response.results;
        }
        return [];
      }),
      catchError(error => {
        console.error('Player search failed:', error);
        return throwError(() => this.formatError(error));
      })
    );
  }

  /**
   * Get player profile by ID
   * Note: v4 API doesn't have a separate profile endpoint, so we get it from results
   */
  getPlayerProfile(playerId: string): Observable<UTRProfile> {
    // Get results and extract profile from the first match
    return this.getPlayerResults(playerId, 's', 'last').pipe(
      map(results => {
        // Extract player profile from results
        if (results.events && results.events.length > 0) {
          for (const event of results.events) {
            if (event.draws && event.draws.length > 0) {
              for (const draw of event.draws) {
                if (draw.results && draw.results.length > 0) {
                  const firstResult = draw.results[0];
                  // Find the player in the match
                  const playerData = firstResult.isWinner 
                    ? firstResult.players.winner1 
                    : firstResult.players.loser1;
                  
                  if (playerData && playerData.id === playerId) {
                    return {
                      id: playerData.id,
                      firstName: playerData.firstName || '',
                      lastName: playerData.lastName || '',
                      singlesUtr: playerData.singlesUtr || 0,
                      doublesUtr: playerData.doublesUtr || 0,
                      city: playerData.city,
                      state: playerData.state,
                      gender: playerData.gender
                    };
                  }
                }
              }
            }
          }
        }
        
        // If no matches found, return a basic profile
        throw new Error('No match results found for this player');
      }),
      catchError(error => {
        console.error('Failed to fetch player profile:', error);
        return throwError(() => this.formatError(error));
      })
    );
  }

  /**
   * Get player match results
   * @param playerId Player ID
   * @param type 's' for singles, 'd' for doubles
   * @param year 'last' for recent matches or specific year
   */
  getPlayerResults(
    playerId: string, 
    type: 's' | 'd' = 's',
    year: string = 'last'
  ): Observable<UTRResultsResponse> {
    const url = `${this.getBaseUrl()}/player/${playerId}/results?type=${type}&year=${year}`;
    
    return this.makeRequest<UTRResultsResponse>(url).pipe(
      catchError(error => {
        console.error('Failed to fetch player results:', error);
        return throwError(() => this.formatError(error));
      })
    );
  }

  /**
   * Get player rating history and stats (Power subscription feature)
   * Fetches comprehensive stats including rating history over time
   */
  getRatingHistory(
    playerId: string, 
    type: 's' | 'd' = 's',
    months: number = 12,
    resultType: 'verified' | 'all' = 'verified'
  ): Observable<any> {
    const typeParam = type === 's' ? 'singles' : 'doubles';
    const url = `${this.getBaseUrl()}/player/${playerId}/all-stats?type=${typeParam}&resultType=${resultType}&months=${months}&fetchAllResults=false`;
    
    console.log('Fetching rating history from:', url);
    
    return this.makeRequest<any>(url).pipe(
      tap(response => console.log('Rating history response:', response)),
      catchError(error => {
        console.warn('Rating history endpoint error:', error.status, error.message);
        return throwError(() => new Error('Rating history not available'));
      })
    );
  }

  /**
   * Format error message for display
   */
  private formatError(error: any): Error {
    let message = 'Unknown error occurred';
    
    if (error.status === 0) {
      message = 'Cannot connect to UTR API. This is likely a CORS issue. See troubleshooting guide.';
    } else if (error.status === 401) {
      message = 'Authentication failed. Your JWT token may be expired or invalid.';
    } else if (error.status === 403) {
      message = 'Access forbidden. Check your JWT token.';
    } else if (error.status === 404) {
      message = 'Player not found. Check the Player ID.';
    } else if (error.error && error.error.message) {
      message = error.error.message;
    } else if (error.message) {
      message = error.message;
    }
    
    return new Error(message);
  }

  /**
   * Parse UTR results into the format expected by the app
   */
  parseUTRResults(resultsResponse: UTRResultsResponse, playerProfile: UTRProfile): any[] {
    const matches: any[] = [];
    const playerId = playerProfile.id;
    
    if (!resultsResponse.events || !Array.isArray(resultsResponse.events)) {
      return matches;
    }

    resultsResponse.events.forEach(event => {
      if (!event.draws || !Array.isArray(event.draws)) return;
      
      event.draws.forEach(draw => {
        if (!draw.results || !Array.isArray(draw.results)) return;
        
        draw.results.forEach(result => {
          try {
            // Determine if player was winner or loser
            const isWinner = result.isWinner;
            const playerData = isWinner ? result.players.winner1 : result.players.loser1;
            const opponentData = isWinner ? result.players.loser1 : result.players.winner1;

            if (!playerData || !opponentData) return;

            // Calculate games won from score
            let playerGamesWon = 0;
            let opponentGamesWon = 0;

            if (result.score && typeof result.score === 'object') {
              Object.values(result.score).forEach((set: any) => {
                if (set && typeof set === 'object' && 'winner' in set && 'loser' in set) {
                  if (isWinner) {
                    playerGamesWon += set.winner || 0;
                    opponentGamesWon += set.loser || 0;
                  } else {
                    playerGamesWon += set.loser || 0;
                    opponentGamesWon += set.winner || 0;
                  }
                }
              });
            }

            const totalGames = playerGamesWon + opponentGamesWon;
            if (totalGames === 0) return;

            matches.push({
              datetime: new Date(result.date),
              playerName: `${playerData.firstName || ''} ${playerData.lastName || ''}`.trim(),
              opponentName: `${opponentData.firstName || ''} ${opponentData.lastName || ''}`.trim(),
              playerUTR: playerData.singlesUtr || playerData.doublesUtr || 0,
              opponentUTR: opponentData.singlesUtr || opponentData.doublesUtr || 0,
              playerGamesWon: playerGamesWon,
              opponentGamesWon: opponentGamesWon,
              totalGames: totalGames,
              winPercentage: (playerGamesWon / totalGames * 100).toFixed(1)
            });
          } catch (error) {
            console.error('Error parsing result:', error);
          }
        });
      });
    });

    return matches.sort((a, b) => b.datetime.getTime() - a.datetime.getTime());
  }

  /**
   * Check if proxy is needed
   */
  needsProxy(): boolean {
    return !this.USE_PROXY;
  }

  /**
   * Get proxy setup instructions
   */
  getProxyInstructions(): string {
    return `
Due to browser security (CORS), you need to set up a simple proxy server.

Quick Setup (5 minutes):
1. Install Node.js if you haven't
2. Create a file called 'proxy-server.js'
3. Copy the proxy code from PROXY-SETUP.md
4. Run: node proxy-server.js
5. Set USE_PROXY = true in this service

The proxy will forward requests with proper authentication.
    `.trim();
  }
}
