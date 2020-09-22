import { ObservableList, Observable } from "../observable/observable.js";
import { Attribute }      from "../presentationModel/presentationModel.js";
import { Scheduler }      from "../dataflow/dataflow.js";
import { fortuneService } from "./fortuneService.js";

export { TodoController, TodoItemsView, TodoTotalView, TodoOpenView, TodoDetailView}

const TodoController = () => {

    const Todo = () => {                               // facade
        const textAttr = Attribute("text");
        const doneAttr = Attribute(false);

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
            isTextDirty:        textAttr.dirtyObs.getValue,
            onTextDirtyChanged: textAttr.dirtyObs.onChange,
            saveText:           textAttr.saveValue,
            resetText:          textAttr.resetValue,
            /* FIXME changes end */
        }
    };

    const todoModel = ObservableList([]); // observable array of Todos, this state is private
    const selectedTodoModel = Observable();
    const scheduler = Scheduler();

    const addTodo = () => {
        const newTodo = Todo();
        todoModel.add(newTodo);
        return newTodo;
    };

    const addFortuneTodo = () => {

        const newTodo = Todo();

        todoModel.add(newTodo);
        newTodo.setText('...');

        scheduler.add( ok =>
           fortuneService( text => {
                   newTodo.setText(text);
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
        setSelectedTodo:    selectedTodoModel.setValue,
        onSelectedTodoChange: selectedTodoModel.onChange
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
        todo.onTextDirtyChanged((dirty) => {
            dirty
                ? labelElement.classList.add("dirty")
                : labelElement.classList.remove("dirty")
        });

        labelElement.onclick = () => todoController.setSelectedTodo(todo);
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
    const [label, inputElement, saveElement, resetElement] = detailContainer.children;
    const render = todo => {
        // disable input elements when todo undefined
        [...detailContainer.children].forEach(child => child.disabled = !todo);
        if (!todo) {
            inputElement.value = "";
            return;
        }

        inputElement.oninput = _ => todo.setText(inputElement.value);


        todo.onTextChanged(() => inputElement.value = todo.getText());
        todo.onTextValidChanged(
            valid => {
                valid
                    ? inputElement.classList.remove("invalid")
                    : inputElement.classList.add("invalid");
                saveElement.disabled = !valid;
            }
        );
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