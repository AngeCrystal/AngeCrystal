## PatchPilot

A coding-agent experiment built in Python. I want to turn “the model suggests a code change” into an execution process that can be inspected.

```text
read → propose → preview diff → approve → write → test and report
```

The model proposes edits; the host computes the diff and checks execution conditions. Approval belongs to a specific preview, and file state is checked again before writing.

Iterations have added tool registration and mode boundaries, session-context compression, and editing operations such as local replacements and file creation.

I'm particularly interested in making failures understandable. A successful write followed by a failed test is different from an edit that never ran. This remains an experiment with limitations: multi-file writes, for example, do not provide atomic transactions or automatic rollback.

More open questions in `/agent-notes`.

[View the GitHub repository ↗](https://github.com/AngeCrystal/patchpilot)
