const command = new Deno.Command(Deno.execPath(), {
  args: ["task", "clean"],
  stdout: "inherit",
  stderr: "inherit",
});

const clean = await command.output();
if (!clean.success) {
  Deno.exit(clean.code);
}

const build = new Deno.Command(Deno.execPath(), {
  args: ["task", "build"],
  stdout: "inherit",
  stderr: "inherit",
});

const buildResult = await build.output();
if (!buildResult.success) {
  Deno.exit(buildResult.code);
}

const desktop = new Deno.Command(Deno.execPath(), {
  args: ["desktop", "--allow-run", "--include", "dist", "desktop.ts"],
  stdout: "inherit",
  stderr: "inherit",
});

const result = await desktop.output();
Deno.exit(result.code);
