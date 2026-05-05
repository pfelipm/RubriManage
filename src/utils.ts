import { Indicator, Level } from './types';

export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function parsePastedRubric(text: string): { title: string; indicators: Indicator[] } {
  const lines = text.trim().split('\n');
  const title = lines[0]?.trim() || 'Nueva Rúbrica';
  const indicators: Indicator[] = [];

  const rows = lines.slice(1).map(line => line.split(/\t|\|/).map(cell => cell.trim()).filter(Boolean));

  if (rows.length > 0) {
    const levelHeaders = rows[0];
    const dataRows = rows.slice(1);

    dataRows.forEach(row => {
      if (row.length > 1) {
        const indicatorName = row[0];
        const levels: Level[] = [];
        
        for (let i = 1; i < row.length; i++) {
          const levelName = levelHeaders[i] || `Nivel ${i}`;
          const scoreMatch = levelName.match(/(\d+(\.\d+)?)/) || row[i].match(/(\d+(\.\d+)?)/);
          const score = scoreMatch ? parseFloat(scoreMatch[1]) : (row.length - i);
          
          levels.push({
            id: generateId(),
            name: levelName,
            score: score,
            description: row[i]
          });
        }

        indicators.push({
          id: generateId(),
          name: indicatorName,
          weight: 1,
          levels: levels
        });
      }
    });
  }

  return { title, indicators };
}

export function calculateScore(indicators: Indicator[], selections: Record<string, string>, maxScore: number = 10): number {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  indicators.forEach((indicator, index) => {
    const weight = Number(indicator.weight) || 0;
    totalWeight += weight;

    // Try to find by ID
    let selectedLevel: Level | undefined;
    
    if (indicator.id && selections[indicator.id]) {
      selectedLevel = indicator.levels.find(l => l.id === selections[indicator.id]);
    } 
    
    // Fallback to index for legacy data
    if (!selectedLevel) {
      const legacyValue = selections[index] !== undefined ? selections[index] : (selections as any)[index];
      if (legacyValue !== undefined) {
        selectedLevel = indicator.levels[Number(legacyValue)];
      }
    }

    if (selectedLevel) {
      const maxLevelScore = Math.max(...indicator.levels.map(l => Number(l.score)));
      const currentLevelScore = Number(selectedLevel.score) || 0;
      const normalizedScore = maxLevelScore > 0 ? currentLevelScore / maxLevelScore : 0;
      
      totalWeightedScore += normalizedScore * weight;
    }
  });

  if (totalWeight === 0) return 0;
  return (totalWeightedScore / totalWeight) * maxScore;
}
