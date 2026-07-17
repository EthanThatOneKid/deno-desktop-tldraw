const command = new Deno.Command(Deno.execPath(), {
  args: ["task", "clean"],
  stdout: "inherit",
  stderr: "inherit",
});

const clean = await command.output();
if (!clean.success) {
  Deno.exit(clean.code);
}

const desktop = new Deno.Command(Deno.execPath(), {
  args: ["desktop", "."],
  stdout: "inherit",
  stderr: "inherit",
});

const result = await desktop.output();
Deno.exit(result.code);
