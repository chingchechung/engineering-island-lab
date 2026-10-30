"""Read-only Python/JavaScript/Schema parity for the pinned synthetic corpus.

Requires Python 3 and test-only jsonschema (python -m pip install jsonschema).
No GUI, reference repository, provider connection or course data is needed.
"""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import types

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / "test/fixtures/legacy/reference"
sys.path.insert(0, str(REFERENCE))
from tests.contract_cases import contract_cases
from tests.contract_cases_v2 import answer_cases


def load_python(name, source):
    module = types.ModuleType(name)
    module.__file__ = str(REFERENCE / "tools/assignment_data.py")
    sys.modules[name] = module
    exec(compile(source, module.__file__, "exec"), module.__dict__)
    return module


source = (REFERENCE / "tools/assignment_data.py").read_text(encoding="utf-8")
original = load_python("original_assignment_parity", source)
# Independent Python implementation gets the same explicit range-only extension
# in memory. The copied source stays byte-identical and is never rewritten.
ported_source = source.replace("1[0-2]", "1[0-5]") \
    .replace("Expected S01 through S12.", "Expected S01 through S15.") \
    .replace("len(units) > 12", "len(units) > 15") \
    .replace("At most 12 units are allowed.", "At most 15 units are allowed.")
ported = load_python("island_assignment_parity", ported_source)


def evaluate(module, case):
    if case["kind"] == "unit":
        issues = module.validate_unit(case["data"], case.get("filename"))
        normalized = module.normalize_unit(case["data"])
    else:
        issues = module.validate_manifest(case["data"])
        normalized = module.normalize_manifest(case["data"])
    return {"errors": [issue.as_dict() for issue in issues], "normalized": normalized}


def main():
    from jsonschema import Draft202012Validator

    cases, answers = contract_cases(), answer_cases()
    frozen = json.loads((ROOT / "test/fixtures/legacy/corpus.json").read_text(encoding="utf-8"))
    assert frozen == {"cases": cases, "answers": answers}, "Frozen corpus must match pinned generators"
    extended = []
    for version in (1, 2):
        for count, filename in ((4, "S01.json"), (5, "S02.json")):
            fixture_path = REFERENCE / "tests/fixtures" / ("v2" if version == 2 else "") / filename
            fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
            for number in (12, 13, 14, 15):
                data = deepcopy(fixture)
                data["unitId"] = f"S{number:02}"
                extended.append({"name": f"extended v{version} {count} questions S{number:02}",
                    "kind": "unit", "data": data, "filename": f"S{number:02}.json", "valid": True})
    manifest = {"schemaVersion": 1, "units": [
        {"unitId": f"S{number:02}", "title": f"Unit {number}", "file": f"S{number:02}.json"}
        for number in range(1, 16)]}
    extended.append({"name": "fifteen-entry manifest", "kind": "manifest", "data": manifest, "valid": True})

    payload = {"cases": cases, "answers": answers}
    process = subprocess.run(["node", str(ROOT / "scripts/legacy-parity.mjs"), "--stdin"],
        input=json.dumps(payload, ensure_ascii=False), text=True, encoding="utf-8",
        capture_output=True, check=True, cwd=ROOT)
    output = json.loads(process.stdout)
    for key in ("youtubeUrl", "googleFormUrl"):
        assert output["rules"][key] == original.UNIT_SCHEMA["$defs"][key]["pattern"], key
    for index, case in enumerate(cases):
        before = deepcopy(case["data"])
        assert evaluate(original, case) == output["original"]["results"][index], ("Original Python/JS", case["name"])
        assert evaluate(ported, case) == output["island"]["results"][index], ("Island Python/JS", case["name"])
        assert before == case["data"], ("Input mutated", case["name"])
    expected_answers = [case["expected"] for case in answers]
    for module in (original, ported):
        assert [module.accepts_answer(case["question"], case["selected"]) for case in answers] == expected_answers
    assert output["original"]["answers"] == output["island"]["answers"] == expected_answers

    schemas = {}
    for name in ("assignment-v1", "assignment-v2", "manifest-v1"):
        schema = json.loads((ROOT / "schemas" / f"{name}.schema.json").read_text(encoding="utf-8"))
        Draft202012Validator.check_schema(schema)
        schemas[name] = Draft202012Validator(schema)
    for case in cases + extended:
        result = evaluate(ported, case)
        expected = not result["errors"]
        if case["kind"] == "unit":
            if result["errors"] and all(issue["code"] == "filename" for issue in result["errors"]):
                expected = True  # Filename context lives outside JSON Schema.
            version = 2 if isinstance(result["normalized"], dict) and result["normalized"].get("schemaVersion") == 2 else 1
            validator = schemas[f"assignment-v{version}"]
        else:
            validator = schemas["manifest-v1"]
        assert (not list(validator.iter_errors(result["normalized"]))) == expected, ("Schema", case["name"])
    # The added S13–S15 cases are checked by the same real JavaScript entrypoint
    # independently of the old corpus's expected-valid flags.
    extended_process = subprocess.run(["node", "--input-type=module", "-e",
        "import {evaluate} from './scripts/legacy-parity.mjs';"
        "import * as island from './src/quiz-contract.js';"
        "let s='';for await(const c of process.stdin)s+=c;"
        "process.stdout.write(JSON.stringify(evaluate(island,JSON.parse(s))));"],
        input=json.dumps({"cases": extended, "answers": []}), text=True, encoding="utf-8",
        capture_output=True, check=True, cwd=ROOT)
    extended_output = json.loads(extended_process.stdout)
    for case, result in zip(extended, extended_output["results"], strict=True):
        assert result == evaluate(ported, case), ("Extended Python/JS", case["name"])
        assert not result["errors"], case["name"]
    summary = output["summary"] | {"extendedCases": len(extended),
        "schemaCases": len(cases) + len(extended), "pythonParity": "passed", "schemaParity": "passed"}
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
