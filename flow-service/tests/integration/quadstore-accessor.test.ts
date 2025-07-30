import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createQuadstoreBundle } from "../../../flow-core/src/utils/quadstore/quadstore-factory.ts";
import { copyGraph, clearGraph, putJsonLdToGraph } from "../../../flow-core/src/utils/quadstore-utils.ts";

Deno.test("Quadstore SPARQL query integration test", async () => {
  const testQuadstoreBundle = await createQuadstoreBundle();
  const df = testQuadstoreBundle.df;
  const store = testQuadstoreBundle.store;
  const engine = testQuadstoreBundle.engine;

  const testGraph = df.namedNode("http://example.org/testGraph");

  // Clear graph if exists
  await clearGraph(testGraph, { store });

  // Insert test data
  const testData = {
    "@context": {
      ex: "http://example.org/",
    },
    "@id": "ex:subject1",
    "ex:predicate1": "object1",
  };
  await putJsonLdToGraph(testData, testGraph.value, testQuadstoreBundle);

  // Query the graph using SPARQL via Comunica engine
  const query = `
    PREFIX ex: <http://example.org/>
    SELECT ?o WHERE {
      GRAPH <${testGraph.value}> {
        ex:subject1 ex:predicate1 ?o .
      }
    }
  `;

  const result = [];
  const bindingsStream = await engine!.queryBindings(query, { sources: [store] });
  for await (const binding of bindingsStream as any) {
    result.push(binding.get("o").value);
  }

  assertEquals(result.length, 1);
  assertEquals(result[0], "object1");
});
