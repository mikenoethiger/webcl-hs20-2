import { ObservableList, Observable } from "../observable/observable.js";
import { Attribute }      from "../presentationModel/presentationModel.js";
import { Scheduler }      from "../dataflow/dataflow.js";
import { fortuneService } from "./fortuneService.js";

export { TodoController, TodoItemsView, TodoTotalView, TodoOpenView, TodoDetailView}

const TodoController = () => {

    const Todo = () => {                               // facade
        const textAttr = Attribute("text");
        const doneAttr = Attribute(false);
		const cdate = Attribute("text");

        textAttr.setConverter( input => input.toUpperCase() );
        textAttr.setValidator( input => input.length >= 3   );

        return {
            getDone:            doneAttr.valueObs.getValue,
            setDone:            doneAttr.valueObs.setValue,
            onDoneChanged:      doneAttr.valueObs.onChange,
            getText:            textAttr.valueObs.getValue,
            setText:            textAttr.setConvertedValue,
            onTextChanged:      textAttr.valueObs.onChange,
            onTextValidChanged: textAttr.validObs.onChange,
            /* FIXME changes start */
            getCreationDate:	cdate.valueObs.getValue,
            setCreationDate:	cdate.setConvertedValue,
            onCreationDateChanged: cdate.valueObs.onChange,
            isTextDirty:        textAttr.dirtyObs.getValue,
            onTextDirtyChanged: textAttr.dirtyObs.onChange,
            saveText:           textAttr.saveValue,
            resetText:          textAttr.resetValue,
            /* FIXME changes end */
        }
    };

    const todoModel = ObservableList([]); // observable array of Todos, this state is private
    /* FIXME changes start */
    const selectedTodoModel = Observable();
    /* FIXME changes end */

    const scheduler = Scheduler();

	const getDateString = () => new Date().toLocaleDateString() + ' ('+new Date().toLocaleString('en-us', {weekday:'long'}) + ')';

    const addTodo = () => {
        const newTodo = Todo();
		newTodo.setCreationDate(getDateString());
        todoModel.add(newTodo);
        return newTodo;
    };

    const addFortuneTodo = () => {

        const newTodo = Todo();

        todoModel.add(newTodo);
        newTodo.setText('...');

		newTodo.setCreationDate(getDateString());

        scheduler.add( ok =>
           fortuneService( text => {
                   newTodo.setText(text);
                   /* FIXME changes start */
                   newTodo.saveText();
                   /* FIXME changes end */
                   ok();
               }
           )
        );

    };

    /* FIXME changes start */
    todoModel.onAdd(todo => selectedTodoModel.setValue(todo));
    todoModel.onDel(removedTodo => {
        if (removedTodo === selectedTodoModel.getValue()) {
            selectedTodoModel.setValue(null);
        }
    });
    /* FIXME changes end */

    return {
        numberOfTodos:      todoModel.count,
        numberOfopenTasks:  () => todoModel.countIf( todo => ! todo.getDone() ),
        addTodo:            addTodo,
        addFortuneTodo:     addFortuneTodo,
        removeTodo:         todoModel.del,
        onTodoAdd:          todoModel.onAdd,
        onTodoRemove:       todoModel.onDel,
        removeTodoRemoveListener: todoModel.removeDeleteListener, // only for the test case, not used below
        /* FIXME changes start */
        setSelectedTodo:    selectedTodoModel.setValue,
        onSelectedTodoChange: selectedTodoModel.onChange
        /* FIXME changes end */
    }
};


// View-specific parts

const TodoItemsView = (todoController, rootElement) => {

    const render = todo => {

        function createElements() {
            const template = document.createElement('DIV'); // only for parsing
            template.innerHTML = `
                <button class="delete">&times;</button>
                <label></label>
                <input type="checkbox">            
            `;
            return template.children;
        }
        const [deleteButton, labelElement, checkboxElement] = createElements();

        checkboxElement.onclick = _ => todo.setDone(checkboxElement.checked);
        deleteButton.onclick    = _ => todoController.removeTodo(todo);

        todoController.onTodoRemove( (removedTodo, removeMe) => {
            if (removedTodo !== todo) return;
            rootElement.removeChild(labelElement);
            rootElement.removeChild(deleteButton);
            rootElement.removeChild(checkboxElement);
            removeMe();
        } );

        // inputElement.oninput = _ => todo.setText(inputElement.value);

        todo.onTextChanged(() => labelElement.innerText = todo.getText());

        /* FIXME changes start */
        // emphasize dirty todo
        todo.onTextDirtyChanged((dirty) => {
            dirty
                ? labelElement.classList.add("dirty")
                : labelElement.classList.remove("dirty")
        });

        // select todo onclick
        labelElement.onclick = () => todoController.setSelectedTodo(todo);

        // emphasize selected todo
        todoController.onSelectedTodoChange(selectedTodo => {
            todo === selectedTodo
                ? labelElement.classList.add("selected")
                : labelElement.classList.remove("selected")
        });
        /* FIXME changes end */

        todo.onTextValidChanged(
            valid => valid
              ? labelElement.classList.remove("invalid")
              : labelElement.classList.add("invalid")
        );

        rootElement.appendChild(deleteButton);
        rootElement.appendChild(labelElement);
        rootElement.appendChild(checkboxElement);
    };

    // binding

    todoController.onTodoAdd(render);

    // we do not expose anything as the view is totally passive.
};

const TodoTotalView = (todoController, numberOfTasksElement) => {

    const render = () =>
        numberOfTasksElement.innerText = "" + todoController.numberOfTodos();

    // binding

    todoController.onTodoAdd(render);
    todoController.onTodoRemove(render);
};


const TodoOpenView = (todoController, numberOfOpenTasksElement) => {

    const render = () =>
        numberOfOpenTasksElement.innerText = "" + todoController.numberOfopenTasks();

    // binding

    todoController.onTodoAdd(todo => {
        render();
        todo.onDoneChanged(render);
    });
    todoController.onTodoRemove(render);
};



/* FIXME changes start */
const TodoDetailView = (todoController, detailContainer) => {

	const dateElement = document.getElementById("creationDateDetail");
	const saveElement = document.getElementById("saveBtn");
	const resetElement = document.getElementById("resetBtn");
	const inputElement = document.getElementById("todoText");

    const render = todo => {
        // disable input elements when no todo selected
        [...detailContainer.children].forEach(child => child.disabled = !todo);
        // reset form when no todo selected
        if (!todo) {
            inputElement.value = "";
			dateElement.value = "";
            return;
        }

        // update todo text
        inputElement.oninput = _ => todo.setText(inputElement.value);
        // creation date read onnly
		dateElement.value = todo.getCreationDate();
		
        // update UI on model changes
        todo.onTextChanged(() => inputElement.value = todo.getText());
        todo.onCreationDateChanged(() => dateElement.value = todo.getCreationDate());

        // emphasize invalid todo
        todo.onTextValidChanged(
            valid => {
                valid
                    ? inputElement.classList.remove("invalid")
                    : inputElement.classList.add("invalid");
                saveElement.disabled = !valid;
            }
        );
        // emphasize dirty todo
        todo.onTextDirtyChanged(dirty => {
            saveElement.disabled = !dirty;
            resetElement.disabled = !dirty;
        });

        saveElement.onclick = () => todo.saveText();
        resetElement.onclick = () => todo.resetText();
    };

    // binding
    todoController.onSelectedTodoChange(render);

    // we do not expose anything as the view is totally passive.
};
/* FIXME changes end */