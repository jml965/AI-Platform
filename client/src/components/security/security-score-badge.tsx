type SecurityScoreBadgeProps = {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
};

function gradeClasses(grade: SecurityScoreBadgeProps['grade']) {
  switch (grade) {
    case 'A':
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    case 'B':
      return 'bg-green-500/15 text-green-300 border border-green-500/30';
    case 'C':
      return 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30';
    case 'D':
      return 'bg-orange-500/15 text-orange-300 border border-orange-500/30';
    case 'F':
    default:
      return 'bg-red-500/15 text-red-300 border border-red-500/30';
  }
}

export default function SecurityScoreBadge({ score, grade }: SecurityScoreBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-3 rounded-xl px-4 py-2 ${gradeClasses(grade)}`}>
      <span className="text-sm font-medium">Security Score</span>
      <span className="text-lg font-bold">{score}</span>
      <span className="rounded-md bg-white/10 px-2 py-0.5 text-sm font-semibold">
        {grade}
      </span>
    </div>
  );
}
