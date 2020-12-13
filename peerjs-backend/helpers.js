async function serializeTensor(tensor) {
    return {
        "$tensor": {
            "data": await tensor.data(), // doesn't copy (maybe depending on runtime)!
            "shape": tensor.shape,
            "dtype": tensor.dtype
        }
    }
}
function deserializeTensor(dict) {
    const {data, shape, dtype} = dict["$tensor"];
    return tf.tensor(data, shape, dtype); // doesn't copy (maybe depending on runtime)!
}
async function serializeVariable(variable) {
    return {
        "$variable": {
            "name": variable.name,
            "val": await serializeTensor(variable.val),
        }
    }
}

async function serializeWeights(model) {
    return await Promise.all(model.weights.map(serializeVariable));
}

function assignWeightsToModel(serializedWeights, model) {
    // This assumes the weights are in the right order
    model.weights.forEach((weight, idx) => {
        const serializedWeight = serializedWeights[idx]["$variable"];
        const tensor = deserializeTensor(serializedWeight.val);
        weight.val.assign(tensor);
        tensor.dispose();
    });
}

function averageWeightsIntoModel(serializedWeights, model) {
    model.weights.forEach((weight, idx) => {
        const serializedWeight = serializedWeights[idx]["$variable"];

        const tensor = deserializeTensor(serializedWeight.val);
        weight.val.assign(tensor.add(weight.val).div(2)); //average
        tensor.dispose();
    });
}

//////////// TESTING functions - generate random data and labels
function* dataGenerator() {
    for (let i = 0; i < 100; i++) {
        // Generate one sample at a time.
        yield tf.randomNormal([784]);
    }
}
   
function* labelGenerator() {
    for (let i = 0; i < 100; i++) {
        // Generate one sample at a time.
        yield tf.randomUniform([10]);
    }
}
///////////////////////////////////////////////

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function data_received(recv_buffer, key) {
    return new Promise( (resolve) => {
        (function wait_data(){
            if (recv_buffer[key]) {
                return resolve();
            }
            setTimeout(wait_data, 100);
        })();
    });
}

/**
 * Waits until an array reaches a given length. Used to make 
 * sure that all weights from peers are received.
 * @param {Array} arr 
 * @param {int} len 
 */
function check_array_len(arr, len) {
    return new Promise( (resolve) => {
        (function wait_data(){
            if (arr.length === len) {
                return resolve();
            }
            setTimeout(wait_data, 100);
        })();
    });
}

// generates a random string
function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }