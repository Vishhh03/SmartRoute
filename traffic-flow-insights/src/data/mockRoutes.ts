export interface RouteSegment {
  coords: [number, number][];
  baseCongestionMultiplier: number; // For sub-segment variance
}

export interface RouteData {
  id: string;
  name: string;
  segments: RouteSegment[];
}

// High-fidelity paths for Minneapolis (Interpolated to trace curves)
export const HIGH_FIDELITY_PATHS: RouteData[] = [
  {
    id: "airport",
    name: "Airport Expressway",
    segments: [
      {
        // Downtown to 38th St (I-35W S)
        coords: [
          [44.9750, -93.2700],
          [44.9680, -93.2710],
          [44.9610, -93.2730],
          [44.9540, -93.2740],
          [44.9470, -93.2750],
          [44.9400, -93.2760],
        ],
        baseCongestionMultiplier: 1.0,
      },
      {
        // 38th St to MN-62 Interchange (I-35W S)
        coords: [
          [44.9400, -93.2760],
          [44.9330, -93.2770],
          [44.9260, -93.2780],
          [44.9190, -93.2780],
          [44.9120, -93.2780],
          [44.9050, -93.2790],
          [44.8980, -93.2790],
          [44.8910, -93.2800],
        ],
        baseCongestionMultiplier: 1.4, // Bottleneck at the interchange
      },
      {
        // MN-62 E to MSP Airport
        coords: [
          [44.8910, -93.2800],
          [44.8890, -93.2700],
          [44.8880, -93.2600],
          [44.8870, -93.2500],
          [44.8860, -93.2400],
          [44.8850, -93.2300],
          [44.8848, -93.2223],
        ],
        baseCongestionMultiplier: 0.8, // Usually smoother here
      }
    ]
  },
  {
    id: "university",
    name: "University Ave (I-94 E)",
    segments: [
      {
        // Downtown exit
        coords: [
          [44.9750, -93.2700],
          [44.9745, -93.2650],
          [44.9735, -93.2600],
          [44.9720, -93.2550],
        ],
        baseCongestionMultiplier: 1.2,
      },
      {
        // Bridge crossing (Mississippi River)
        coords: [
          [44.9720, -93.2550],
          [44.9705, -93.2500],
          [44.9690, -93.2450],
          [44.9680, -93.2400],
        ],
        baseCongestionMultiplier: 1.5, // Bridge bottleneck
      },
      {
        // UMN Campus approach
        coords: [
          [44.9680, -93.2400],
          [44.9675, -93.2350],
          [44.9675, -93.2300],
          [44.9680, -93.2250],
          [44.9690, -93.2200],
        ],
        baseCongestionMultiplier: 0.9,
      }
    ]
  },
  {
    id: "downtown",
    name: "Downtown Corridor",
    segments: [
      {
        // North loop
        coords: [
          [44.9820, -93.2750],
          [44.9840, -93.2650],
          [44.9820, -93.2550],
        ],
        baseCongestionMultiplier: 0.9,
      },
      {
        // East edge
        coords: [
          [44.9820, -93.2550],
          [44.9770, -93.2520],
          [44.9720, -93.2530],
        ],
        baseCongestionMultiplier: 1.3,
      },
      {
        // South/West curve back
        coords: [
          [44.9720, -93.2530],
          [44.9680, -93.2600],
          [44.9720, -93.2700],
          [44.9770, -93.2780],
          [44.9820, -93.2750],
        ],
        baseCongestionMultiplier: 1.1,
      }
    ]
  }
];
