import { runClassroomAcceptance } from "./classroom-acceptance-core";

runClassroomAcceptance()
  .then((evidence) => {
    console.log(JSON.stringify({ ok: true, evidence }, null, 2));
  })
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  });
