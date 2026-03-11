export async function runReadiness(projectPath: string) {

  const res = await fetch("/api/devops-readiness", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ projectPath })
  });

  if (!res.ok) {
    throw new Error("Readiness failed");
  }

  return res.json();
}
