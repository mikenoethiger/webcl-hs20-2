
import { Observable } from "../observable/observable.js";
import { id }         from "../church/church.js";

export { Attribute }

const Attribute = value => {

    const valueObs = Observable(value);
    const validObs = Observable(true);
    /* FIXME changes start */
    let persistedValue = value;
    const dirtyObs = Observable(false);
    /* FIXME changes end */

    let   converter    = id;
    const setConverter = newConverter => {
        converter = newConverter;
        /* FIXME changes start */
        persistedValue = converter(persistedValue);
        /* FIXME changes end */
        setConvertedValue( valueObs.getValue() );
    }
    const setConvertedValue = value => {
        valueObs.setValue( converter( value ) );
        /* FIXME changes start */
        dirtyObs.setValue(valueObs.getValue() !== persistedValue);
        /* FIXME changes end */
    }
    /* FIXME changes start */
    const saveValue = () => {
        if (!validObs.getValue()) {
            console.error('save on invalid value called');
            return;
        }
        persistedValue = valueObs.getValue();
        dirtyObs.setValue(false);
    }
    const resetValue = () => {
        setConvertedValue(persistedValue);
        saveValue();
    }
    /* FIXME changes end */

    const setValidator = newValidator => valueObs.onChange( value => validObs.setValue( newValidator(value) ) );

    return { valueObs, validObs, dirtyObs, setConverter, setValidator, setConvertedValue, saveValue, resetValue }
};
