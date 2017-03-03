const workflow_es = require("workflow-es");

class SelectOutcome extends workflow_es.StepBody {
    run(context) {
        var result = 0;
        if (this.myValue > 5)
            result = 1;
        return workflow_es.ExecutionResult.resolveOutcome(result);
    }
}

class TaskA extends workflow_es.StepBody {
    run(context) {
        console.log("Doing Task A");
        return workflow_es.ExecutionResult.resolveNext();
    }
}

class TaskB extends workflow_es.StepBody {
    run(context) {
        console.log("Doing Task B");
        return workflow_es.ExecutionResult.resolveNext();
    }
}

class TaskC extends workflow_es.StepBody {
    run(context) {
        console.log("Doing Task C");
        return workflow_es.ExecutionResult.resolveNext();
    }
}

class TaskD extends workflow_es.StepBody {
    run(context) {
        console.log("Doing Task D");
        return workflow_es.ExecutionResult.resolveNext();
    }
}

exports.SelectOutcome = SelectOutcome;
exports.TaskA = TaskA;
exports.TaskB = TaskB;
exports.TaskC = TaskC;
exports.TaskD = TaskD;
