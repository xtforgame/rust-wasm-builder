const path = require("path");
const {
  cargoCmd,
  rustcCmd,
  wasmGCCmd,
  tempDir,
  wasmBindgenCmd,
  wasmBindgenDeps,
} = require("../config.js");
const { exec, joinCmd, exists, writeFile, readFile, mkdir, unlink } = require("./common.js");

function checkBuildPlan(plan) {
  let success = true;
  let invocations = plan["invocations"];

  var custom_build = invocations.find(function(element) {
    return element["target_kind"].includes("custom-build");
  });

  // if (custom_build) {
  //   success = false;
  //   return { success, output: "", message: "the build includes custom builds" };
  // }

  // if (invocations.length > 1) {
  //   success = false;
  //   return { success, output: "", message: "dependencies are currently deactivated" };
  // }

  return { "success": true };
}

async function wasmGC(wasmFile, callback) {
  if (!await exists(wasmFile)) {
    throw new Error("wasm is not found")
  }
  await exec(joinCmd([wasmGCCmd, wasmFile]));
}

async function cargo(tar, options = {}) {
  console.log('options :', options);
  let crateName = 'rustc_h_' + Math.random().toString(36).slice(2);
  let srcDir = tempDir + '/' + crateName;
  let buildDir = !options.buildDir ? srcDir : tempDir + '/' + options.buildDir;

  try {
    await mkdir(srcDir);
  } catch (error) {
  }

  let rustTar = srcDir + '/' + 'lib.tar';
  let wasmFile = srcDir + '/' + 'lib.wasm';
  await writeFile(rustTar, new Buffer(tar, 'base64').toString('ascii'));

  let args = ["tar", "xvf", rustTar, "-C", srcDir];
  await exec(joinCmd(args));
  if (buildDir !== srcDir) {
    try {
      await mkdir(buildDir);
    } catch (error) {
    }
    let args = ["rsync", "-a", "-u", `${srcDir}/`, `${buildDir}/`];
    await exec(joinCmd(args));
  }

  try {
    let args = [cargoCmd, "build"];
    args.push('--manifest-path=' + buildDir + '/' + 'Cargo.toml');
    args.push('--target=wasm32-unknown-unknown');

    if (!options.debug) {
      args.push('--release');
    }

    let planArgs = args.slice(0);
    // planArgs.push("-Z unstable-options");
    // planArgs.push("--build-plan");
    planArgs.push("--quiet");

    // let buildPlanOutput = await exec(joinCmd(planArgs), {});
    // let buildPlan = JSON.parse(buildPlanOutput);
    //  // console.log('buildPlanOutput :', buildPlanOutput);

    // let checkResult = checkBuildPlan(buildPlan);

    // if (!checkResult.success)
    //   return checkResult;

    let output;
    let success = false;

    try {
      output = await exec(joinCmd(args), {});
      success = true;
    } catch(e) {
      output = 'error: ' + e;
    }
    try {
      if (!success)
        return { success, output: "", message: output };

      // let wasmFile = Object.keys(buildPlan["invocations"].slice(-1)[0]["links"])[0];
      let wasmFile = `${buildDir}/target/wasm32-unknown-unknown/release/basic_transform.wasm`;

      let wasmBindgenJs = "";
      let wasm = await readFile(wasmFile);

      let m = await WebAssembly.compile(wasm);
      let ret = { success, message: output };
      if (WebAssembly.Module.customSections(m, "__wasm_bindgen_unstable").length !== 0) {
        // console.log('wasmBindgenCmd, wasmFile :', wasmBindgenCmd, wasmFile);
        await exec(joinCmd([wasmBindgenCmd, wasmFile, '--no-modules', '--out-dir', tempDir]));
        let baseName = path.basename(wasmFile, '.wasm');
        let basePath = path.join(tempDir, baseName);
        wasm = await readFile(basePath + '_bg.wasm');
        ret.wasmBindgenJs = (await readFile(basePath + '.js')).toString();
      } else {
        await exec(joinCmd([wasmGCCmd, wasmFile]));
        wasm = await readFile(wasmFile);
      }
      ret.output = wasm.toString('base64');
      return ret;
    } finally {
      if (success) {}
        //await unlink(wasmFile);
    }
  } finally {
    //await unlink(srcDir);
  }
}

module.exports = function(source, options, callback) {
  cargo(source, options)
    .then(result => callback(null, result))
    .catch(err => callback(err, null));
};
