/**
 * Subject-specific formula / reference cheat sheets.
 * Each entry has a title, optional description, and a list of formula items.
 */

export interface FormulaItem {
  label: string;
  formula: string;
  note?: string;
}

export interface CheatSheet {
  subjectId: string;
  title: string;
  sections: {
    heading: string;
    items: FormulaItem[];
  }[];
}

const CHEAT_SHEETS: Record<string, CheatSheet> = {
  algebra: {
    subjectId: "algebra",
    title: "Algebra Formulas",
    sections: [
      {
        heading: "Quadratic",
        items: [
          { label: "Quadratic Formula", formula: "x = (−b ± √(b²−4ac)) / 2a" },
          { label: "Discriminant", formula: "Δ = b² − 4ac", note: "Δ>0: 2 real roots; Δ=0: 1 root; Δ<0: no real roots" },
          { label: "Vertex Form", formula: "y = a(x−h)² + k" },
        ],
      },
      {
        heading: "Factoring",
        items: [
          { label: "Difference of Squares", formula: "a² − b² = (a+b)(a−b)" },
          { label: "Perfect Square", formula: "(a+b)² = a² + 2ab + b²" },
          { label: "Sum of Cubes", formula: "a³ + b³ = (a+b)(a²−ab+b²)" },
          { label: "Difference of Cubes", formula: "a³ − b³ = (a−b)(a²+ab+b²)" },
        ],
      },
      {
        heading: "Exponents & Logs",
        items: [
          { label: "Power Rule", formula: "aᵐ · aⁿ = aᵐ⁺ⁿ" },
          { label: "Quotient Rule", formula: "aᵐ / aⁿ = aᵐ⁻ⁿ" },
          { label: "Log Product", formula: "log(ab) = log a + log b" },
          { label: "Log Quotient", formula: "log(a/b) = log a − log b" },
          { label: "Change of Base", formula: "logₐb = ln b / ln a" },
        ],
      },
    ],
  },

  calculus: {
    subjectId: "calculus",
    title: "Calculus Formulas",
    sections: [
      {
        heading: "Derivatives",
        items: [
          { label: "Power Rule", formula: "d/dx[xⁿ] = nxⁿ⁻¹" },
          { label: "Product Rule", formula: "d/dx[uv] = u'v + uv'" },
          { label: "Quotient Rule", formula: "d/dx[u/v] = (u'v − uv') / v²" },
          { label: "Chain Rule", formula: "d/dx[f(g(x))] = f'(g(x)) · g'(x)" },
          { label: "sin", formula: "d/dx[sin x] = cos x" },
          { label: "cos", formula: "d/dx[cos x] = −sin x" },
          { label: "eˣ", formula: "d/dx[eˣ] = eˣ" },
          { label: "ln x", formula: "d/dx[ln x] = 1/x" },
        ],
      },
      {
        heading: "Integrals",
        items: [
          { label: "Power Rule", formula: "∫xⁿ dx = xⁿ⁺¹/(n+1) + C" },
          { label: "∫eˣ dx", formula: "eˣ + C" },
          { label: "∫sin x dx", formula: "−cos x + C" },
          { label: "∫cos x dx", formula: "sin x + C" },
          { label: "∫1/x dx", formula: "ln|x| + C" },
        ],
      },
      {
        heading: "Theorems",
        items: [
          { label: "Fundamental Theorem", formula: "∫ₐᵇ f(x)dx = F(b) − F(a)" },
          { label: "L'Hôpital's Rule", formula: "lim f/g = lim f'/g'", note: "When 0/0 or ∞/∞" },
        ],
      },
    ],
  },

  geometry: {
    subjectId: "geometry",
    title: "Geometry Formulas",
    sections: [
      {
        heading: "Area",
        items: [
          { label: "Rectangle", formula: "A = lw" },
          { label: "Triangle", formula: "A = ½bh" },
          { label: "Circle", formula: "A = πr²" },
          { label: "Trapezoid", formula: "A = ½(b₁+b₂)h" },
          { label: "Parallelogram", formula: "A = bh" },
        ],
      },
      {
        heading: "Perimeter / Circumference",
        items: [
          { label: "Circle", formula: "C = 2πr = πd" },
          { label: "Rectangle", formula: "P = 2(l+w)" },
          { label: "Triangle", formula: "P = a + b + c" },
        ],
      },
      {
        heading: "Volume",
        items: [
          { label: "Cube", formula: "V = s³" },
          { label: "Rectangular Prism", formula: "V = lwh" },
          { label: "Cylinder", formula: "V = πr²h" },
          { label: "Sphere", formula: "V = (4/3)πr³" },
          { label: "Cone", formula: "V = (1/3)πr²h" },
        ],
      },
      {
        heading: "Pythagorean",
        items: [
          { label: "Pythagorean Theorem", formula: "a² + b² = c²" },
          { label: "Distance Formula", formula: "d = √((x₂−x₁)² + (y₂−y₁)²)" },
          { label: "Midpoint", formula: "M = ((x₁+x₂)/2, (y₁+y₂)/2)" },
        ],
      },
    ],
  },

  trigonometry: {
    subjectId: "trigonometry",
    title: "Trigonometry Formulas",
    sections: [
      {
        heading: "Basic Ratios",
        items: [
          { label: "sin θ", formula: "opposite / hypotenuse" },
          { label: "cos θ", formula: "adjacent / hypotenuse" },
          { label: "tan θ", formula: "opposite / adjacent = sin/cos" },
          { label: "csc θ", formula: "1 / sin θ" },
          { label: "sec θ", formula: "1 / cos θ" },
          { label: "cot θ", formula: "1 / tan θ" },
        ],
      },
      {
        heading: "Pythagorean Identities",
        items: [
          { label: "Identity 1", formula: "sin²θ + cos²θ = 1" },
          { label: "Identity 2", formula: "1 + tan²θ = sec²θ" },
          { label: "Identity 3", formula: "1 + cot²θ = csc²θ" },
        ],
      },
      {
        heading: "Angle Addition",
        items: [
          { label: "sin(A±B)", formula: "sin A cos B ± cos A sin B" },
          { label: "cos(A±B)", formula: "cos A cos B ∓ sin A sin B" },
          { label: "Double Angle sin", formula: "sin 2θ = 2 sin θ cos θ" },
          { label: "Double Angle cos", formula: "cos 2θ = cos²θ − sin²θ" },
        ],
      },
      {
        heading: "Key Angles",
        items: [
          { label: "sin 30°", formula: "1/2", note: "cos 60° = 1/2" },
          { label: "sin 45°", formula: "√2/2", note: "cos 45° = √2/2" },
          { label: "sin 60°", formula: "√3/2", note: "cos 30° = √3/2" },
          { label: "sin 90°", formula: "1", note: "cos 0° = 1" },
        ],
      },
    ],
  },

  statistics: {
    subjectId: "statistics",
    title: "Statistics Formulas",
    sections: [
      {
        heading: "Central Tendency",
        items: [
          { label: "Mean", formula: "x̄ = Σxᵢ / n" },
          { label: "Median", formula: "Middle value when sorted" },
          { label: "Mode", formula: "Most frequent value" },
        ],
      },
      {
        heading: "Spread",
        items: [
          { label: "Variance (pop.)", formula: "σ² = Σ(xᵢ − μ)² / N" },
          { label: "Std Dev (pop.)", formula: "σ = √(Σ(xᵢ−μ)²/N)" },
          { label: "Std Dev (sample)", formula: "s = √(Σ(xᵢ−x̄)²/(n−1))" },
          { label: "IQR", formula: "IQR = Q3 − Q1" },
        ],
      },
      {
        heading: "Probability",
        items: [
          { label: "P(A or B)", formula: "P(A) + P(B) − P(A∩B)" },
          { label: "P(A and B)", formula: "P(A) · P(B|A)" },
          { label: "Combinations", formula: "C(n,r) = n! / (r!(n−r)!)" },
          { label: "Permutations", formula: "P(n,r) = n! / (n−r)!" },
          { label: "Normal Z-score", formula: "z = (x − μ) / σ" },
        ],
      },
    ],
  },

  physics: {
    subjectId: "physics",
    title: "Physics Formulas",
    sections: [
      {
        heading: "Kinematics",
        items: [
          { label: "Velocity", formula: "v = d / t" },
          { label: "Acceleration", formula: "a = Δv / Δt" },
          { label: "v² = v₀² + 2aΔx", formula: "v² = v₀² + 2aΔx" },
          { label: "Δx", formula: "Δx = v₀t + ½at²" },
        ],
      },
      {
        heading: "Forces",
        items: [
          { label: "Newton's 2nd Law", formula: "F = ma" },
          { label: "Weight", formula: "W = mg", note: "g ≈ 9.8 m/s²" },
          { label: "Friction", formula: "f = μN" },
          { label: "Gravity", formula: "F = Gm₁m₂/r²" },
        ],
      },
      {
        heading: "Energy & Work",
        items: [
          { label: "Work", formula: "W = Fd cos θ" },
          { label: "Kinetic Energy", formula: "KE = ½mv²" },
          { label: "Potential Energy", formula: "PE = mgh" },
          { label: "Power", formula: "P = W/t = Fv" },
        ],
      },
      {
        heading: "Waves & Electricity",
        items: [
          { label: "Wave Speed", formula: "v = fλ" },
          { label: "Ohm's Law", formula: "V = IR" },
          { label: "Power (elec.)", formula: "P = IV = I²R = V²/R" },
        ],
      },
    ],
  },

  chemistry: {
    subjectId: "chemistry",
    title: "Chemistry Formulas",
    sections: [
      {
        heading: "Stoichiometry",
        items: [
          { label: "Moles", formula: "n = m / M", note: "m=mass, M=molar mass" },
          { label: "Avogadro", formula: "N = n × 6.022×10²³" },
          { label: "Molarity", formula: "M = n / V(L)" },
          { label: "Percent Yield", formula: "(actual/theoretical) × 100%" },
        ],
      },
      {
        heading: "Gas Laws",
        items: [
          { label: "Ideal Gas Law", formula: "PV = nRT", note: "R = 8.314 J/mol·K" },
          { label: "Boyle's Law", formula: "P₁V₁ = P₂V₂" },
          { label: "Charles's Law", formula: "V₁/T₁ = V₂/T₂" },
          { label: "Combined Gas", formula: "P₁V₁/T₁ = P₂V₂/T₂" },
        ],
      },
      {
        heading: "Acids & Bases",
        items: [
          { label: "pH", formula: "pH = −log[H⁺]" },
          { label: "pOH", formula: "pOH = −log[OH⁻]" },
          { label: "pH + pOH", formula: "= 14 (at 25°C)" },
          { label: "Ka/Kb", formula: "Ka × Kb = Kw = 1×10⁻¹⁴" },
        ],
      },
    ],
  },

  arithmetic: {
    subjectId: "arithmetic",
    title: "Arithmetic Reference",
    sections: [
      {
        heading: "Order of Operations",
        items: [
          { label: "PEMDAS", formula: "Parentheses → Exponents → Multiply/Divide → Add/Subtract" },
        ],
      },
      {
        heading: "Fractions",
        items: [
          { label: "Add/Subtract", formula: "a/b ± c/d = (ad ± bc) / bd" },
          { label: "Multiply", formula: "(a/b)(c/d) = ac/bd" },
          { label: "Divide", formula: "(a/b) ÷ (c/d) = (a/b)(d/c)" },
        ],
      },
      {
        heading: "Percentages",
        items: [
          { label: "Percent of", formula: "P% of X = (P/100) × X" },
          { label: "Percent change", formula: "((new−old)/old) × 100%" },
        ],
      },
      {
        heading: "Ratios & Proportions",
        items: [
          { label: "Proportion", formula: "a/b = c/d → ad = bc" },
          { label: "Unit Rate", formula: "quantity / 1 unit" },
        ],
      },
    ],
  },

  precalculus: {
    subjectId: "precalculus",
    title: "Pre-Calculus Formulas",
    sections: [
      {
        heading: "Functions",
        items: [
          { label: "Slope-Intercept", formula: "y = mx + b" },
          { label: "Point-Slope", formula: "y − y₁ = m(x − x₁)" },
          { label: "Slope", formula: "m = (y₂−y₁)/(x₂−x₁)" },
          { label: "Composition", formula: "(f∘g)(x) = f(g(x))" },
        ],
      },
      {
        heading: "Sequences & Series",
        items: [
          { label: "Arithmetic nth term", formula: "aₙ = a₁ + (n−1)d" },
          { label: "Arithmetic Sum", formula: "Sₙ = n(a₁+aₙ)/2" },
          { label: "Geometric nth term", formula: "aₙ = a₁ · rⁿ⁻¹" },
          { label: "Geometric Sum", formula: "Sₙ = a₁(1−rⁿ)/(1−r)" },
          { label: "Infinite Geometric", formula: "S = a₁/(1−r), |r|<1" },
        ],
      },
      {
        heading: "Conic Sections",
        items: [
          { label: "Circle", formula: "(x−h)² + (y−k)² = r²" },
          { label: "Parabola", formula: "y = a(x−h)² + k" },
          { label: "Ellipse", formula: "(x−h)²/a² + (y−k)²/b² = 1" },
          { label: "Hyperbola", formula: "(x−h)²/a² − (y−k)²/b² = 1" },
        ],
      },
    ],
  },

  linear_algebra: {
    subjectId: "linear_algebra",
    title: "Linear Algebra",
    sections: [
      {
        heading: "Matrix Operations",
        items: [
          { label: "Transpose", formula: "(Aᵀ)ᵢⱼ = Aⱼᵢ" },
          { label: "Determinant 2×2", formula: "det(A) = ad − bc" },
          { label: "Inverse 2×2", formula: "A⁻¹ = (1/det) [[d,−b],[−c,a]]" },
          { label: "Matrix Mult.", formula: "(AB)ᵢⱼ = Σ Aᵢₖ Bₖⱼ" },
        ],
      },
      {
        heading: "Vectors",
        items: [
          { label: "Dot Product", formula: "a·b = |a||b|cos θ" },
          { label: "Cross Product", formula: "|a×b| = |a||b|sin θ" },
          { label: "Magnitude", formula: "|v| = √(v₁²+v₂²+v₃²)" },
          { label: "Unit Vector", formula: "û = v / |v|" },
        ],
      },
      {
        heading: "Eigenvalues",
        items: [
          { label: "Characteristic Eq.", formula: "det(A − λI) = 0" },
          { label: "Eigenvector", formula: "(A − λI)v = 0" },
        ],
      },
    ],
  },

  economics: {
    subjectId: "economics",
    title: "Economics Formulas",
    sections: [
      {
        heading: "Micro",
        items: [
          { label: "Profit", formula: "π = TR − TC" },
          { label: "Total Revenue", formula: "TR = P × Q" },
          { label: "Marginal Revenue", formula: "MR = ΔTR / ΔQ" },
          { label: "Elasticity (PED)", formula: "PED = %ΔQ / %ΔP" },
        ],
      },
      {
        heading: "Macro",
        items: [
          { label: "GDP (Expenditure)", formula: "GDP = C + I + G + (X−M)" },
          { label: "Inflation Rate", formula: "((CPI₂−CPI₁)/CPI₁) × 100%" },
          { label: "Real GDP", formula: "Nominal GDP / Price Level × 100" },
          { label: "Money Multiplier", formula: "1 / Reserve Ratio" },
        ],
      },
    ],
  },
};

/** Returns the cheat sheet for a given subject ID, or null if none exists. */
export function getCheatSheet(subjectId: string): CheatSheet | null {
  return CHEAT_SHEETS[subjectId] ?? null;
}

/** Returns true if a cheat sheet exists for this subject. */
export function hasCheatSheet(subjectId: string): boolean {
  return subjectId in CHEAT_SHEETS;
}
