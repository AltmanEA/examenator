# Examenator - Technical Specification

## Overview

Examenator is a Visual Studio Code extension designed for organizing and conducting programming exams. It provides features for creating task blocks, forming time-limited tests, and automatically checking solutions.

## Architecture

The application follows a modular architecture with the following main components:

### Core Components

1. **Extension Entry Point** (`extension.ts`)
   - Main activation function that initializes all providers and commands
   - Registers tree views for tasks, tests, and active test
   - Sets up command handlers for all user interactions

2. **Configuration Management** (`config.ts`)
   - Handles reading and writing of `config.json`
   - Defines data structures for blocks and tests
   - Provides default configuration creation

3. **Task Management** (`taskProvider.ts`)
   - Implements TreeDataProvider for the Tasks view
   - Handles block and task creation
   - Manages file creation for tasks (source, task description, test files)

4. **Test Management** (`testProvider.ts`)
   - Implements TreeDataProvider for the Tests view
   - Handles test creation and configuration
   - Manages test definitions in config.json

5. **Active Test Execution** (`activeTestProvider.ts`)
   - Implements TreeDataProvider for the Active Test view
   - Manages test execution and timing
   - Handles file opening and terminal management during tests

## Data Structures

### Config Structure

```typescript
type Block = {
  name: string;
  tasks: string[]; // Array of task names
  template?: string;
  testTemplate?: string;
  // New format for specifying three files
  templates?: {
    source?: string;
    task?: string;
    test?: string;
  };
};

type Tests = {
  time: number;
  blocks: {
    block: string;
    task: number;
  }[];
};
```

### Active Test Task Structure

```typescript
type SelectedTask = {
  block: string;
  taskId: string; // Task identifier instead of number
  name: string;
  template?: string;
  testTemplate?: string;
  // New format for specifying three files
  templates?: {
    source?: string;
    task?: string;
    test?: string;
  };
};
```

## Component Details

### Extension Activation (`extension.ts`)

The extension activates on startup and:
1. Creates instances of all providers (TasksProvider, TestsProvider, ActiveTestProvider)
2. Registers tree views in the activity bar
3. Registers all command handlers
4. Manages the extension lifecycle

### Configuration Management (`config.ts`)

Handles all configuration-related operations:
1. Reading `config.json` from the workspace root
2. Writing updated configuration to `config.json`
3. Providing default configuration when file doesn't exist
4. Managing the path to the blocks directory (default: `src`)

### Task Provider (`taskProvider.ts`)

Manages the Tasks view and task creation:
1. Implements TreeDataProvider to display blocks
2. Handles "Add Block" command to create new blocks
3. Handles "Add Task" command to create new tasks within blocks
4. Creates three files for each task:
   - Source file (implementation)
   - Task file (description)
   - Test file (test implementation)
5. Opens created files in the editor

### Test Provider (`testProvider.ts`)

Manages the Tests view and test creation:
1. Implements TreeDataProvider to display tests
2. Handles "Add Test" command to create new tests
3. Displays test information including time and block details

### Active Test Provider (`activeTestProvider.ts`)

Manages active test execution:
1. Implements TreeDataProvider to display active test tasks
2. Handles "Run Test" command to start a test
3. Manages the countdown timer with visual status bar indicators
4. Handles "Open Task and Test" command to open task files
5. Manages terminal creation for test execution
6. Implements repository reset functionality before test start

## File Management

### Template System

The application uses a flexible template system for file naming:
- `{block}` placeholder is replaced with the block name
- `{task}` placeholder is replaced with the task identifier
- Supports both old format (template/testTemplate) and new format (templates.source/templates.task/templates.test)

### File Creation Process

When adding a task:
1. Three files are created in the block directory:
   - Source file (implementation)
   - Task file (description)
   - Test file (test implementation)
2. Files are opened in adjacent editor columns
3. Task is added to the block's task list in config.json

## Test Execution

### Test Start Process

When running a test:
1. Repository is reset to the last commit
2. All open editors are closed
3. All terminals are disposed
4. Random tasks are selected from specified blocks
5. Active test is set with selected tasks and time
6. Timer starts and status bar item is displayed

### Task Opening Process

When opening a task during a test:
1. Three files are opened in adjacent editor columns:
   - Task file (description)
   - Source file (implementation)
   - Test file (test implementation)
2. A new terminal is created for test execution
3. Test command is sent to the terminal

## Timer Management

The active test timer provides visual feedback:
- Green: Normal time (more than 30% remaining)
- Yellow: Warning time (30% or less remaining)
- Red: Alert time (10% or less remaining)
- Automatic notification when time expires

## Testing

The extension includes both unit and integration tests:
- Unit tests for configuration and provider logic
- Integration tests for UI components
- Tests are run using the VS Code test framework

## Development Workflow

### Building

```bash
npm run compile
```

### Running Tests

```bash
npm test
```

### Development Mode

Press F5 in VS Code to launch the extension in development mode.

## Extension Manifest

The extension is defined in `package.json` with:
- Required VS Code engine version
- Activation events (onStartupFinished)
- Contributed commands and menus
- Views and view containers
- Categories and description

## Error Handling

The application includes error handling for:
- File system operations
- Configuration reading/writing
- Git operations
- User input validation