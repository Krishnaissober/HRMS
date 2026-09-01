function inlineDescription(value: string) {
  return value.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    return <span key={index}>{part}</span>;
  });
}

export function FormDescription({ value }: { value: string }) {
  const lines = value.split(/\r?\n/);
  const content: React.ReactNode[] = [];
  let bullets: React.ReactNode[] = [];
  function flushBullets() {
    if (bullets.length) {
      content.push(<ul key={`list-${content.length}`}>{bullets}</ul>);
      bullets = [];
    }
  }
  lines.forEach((line, index) => {
    if (line.trim().startsWith("- ")) {
      bullets.push(<li key={index}>{inlineDescription(line.trim().slice(2))}</li>);
    } else if (line.trim()) {
      flushBullets();
      content.push(<p key={index}>{inlineDescription(line)}</p>);
    }
  });
  flushBullets();
  return <div className="public-form-description">{content}</div>;
}
