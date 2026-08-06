import { describe, expect, it } from "vitest";
import { escapeCsvField, toCsv } from "./csv";

describe("escapeCsvField", () => {
  it("leaves plain values alone", () => {
    expect(escapeCsvField("Electric")).toBe("Electric");
    expect(escapeCsvField(42)).toBe("42");
  });

  it("renders null and undefined as empty", () => {
    expect(escapeCsvField(null)).toBe("");
    expect(escapeCsvField(undefined)).toBe("");
  });

  it("quotes values containing a comma", () => {
    // Addresses almost always contain one; unquoted they split the row.
    expect(escapeCsvField("1368 E 28th St, Oakland, CA")).toBe(
      '"1368 E 28th St, Oakland, CA"'
    );
  });

  it("doubles embedded quotes", () => {
    expect(escapeCsvField('Unit "A"')).toBe('"Unit ""A"""');
  });

  it("quotes values containing newlines", () => {
    expect(escapeCsvField("line one\nline two")).toBe('"line one\nline two"');
    expect(escapeCsvField("line one\r\nline two")).toBe('"line one\r\nline two"');
  });

  it("neutralises spreadsheet formulas", () => {
    // A note beginning with = would be executed on open, not displayed.
    expect(escapeCsvField("=1+1")).toBe("\t=1+1");
    expect(escapeCsvField("+SUM(A1)")).toBe("\t+SUM(A1)");
    expect(escapeCsvField("-2")).toBe("\t-2");
    expect(escapeCsvField("@import")).toBe("\t@import");
  });

  it("quotes a formula that also contains a comma", () => {
    expect(escapeCsvField("=HYPERLINK(a,b)")).toBe('"\t=HYPERLINK(a,b)"');
  });
});

describe("toCsv", () => {
  const columns = [
    { header: "Name", value: (r: { name: string; rent: number }) => r.name },
    { header: "Rent", value: (r: { name: string; rent: number }) => r.rent },
  ];

  it("writes a header even with no rows", () => {
    expect(toCsv([], columns)).toBe("Name,Rent");
  });

  it("writes one line per row, CRLF separated", () => {
    const csv = toCsv(
      [
        { name: "Josen X", rent: 4500 },
        { name: "Justin", rent: 1850 },
      ],
      columns
    );
    expect(csv).toBe("Name,Rent\r\nJosen X,4500\r\nJustin,1850");
  });

  it("keeps column count stable when a field contains a comma", () => {
    const csv = toCsv([{ name: "Smith, John", rent: 1000 }], columns);
    const dataLine = csv.split("\r\n")[1];
    // Quoted, so the comma inside the name does not create a third column.
    expect(dataLine).toBe('"Smith, John",1000');
  });
});
