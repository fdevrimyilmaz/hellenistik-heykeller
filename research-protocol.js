/* Araştırma protokolü: örneklem, gruplama ve betimsel doğrulama araçları. */
(function (root) {
  const model =
    typeof module !== "undefined" && module.exports
      ? require("./research-model")
      : root.HellenisticModel;
  const roles = {
    sample: "Araştırma örneklemi",
    candidate: "Aday / inceleme bekliyor",
    reference: "Künye / karşılaştırma dışı referans",
  };
  const MINIMUM_FIELDS = 3;
  function role(record) {
    return record.sampleRole || "candidate";
  }
  function eligible(record) {
    return (
      role(record) === "sample" &&
      model.inScope(record) &&
      record.identityConfidence !== "Tartışmalı"
    );
  }
  function validateCatalogRecord(r) {
    if (
      !r ||
      typeof r !== "object" ||
      !["Apollon", "Afrodit"].includes(r.subject) ||
      typeof r.id !== "string" ||
      !r.id.trim() ||
      typeof r.title !== "string" ||
      !r.title.trim() ||
      typeof r.source !== "string" ||
      !/^https:\/\//.test(r.source) ||
      !Object.hasOwn(roles, role(r)) ||
      !r.features
    )
      return false;
    try {
      const url = new URL(r.source);
      if (
        url.protocol !== "https:" ||
        !url.hostname ||
        url.username ||
        url.password
      )
        return false;
      if (role(r) === "sample" && /(^|\.)louvre\.fr$/i.test(url.hostname))
        return false;
    } catch {
      return false;
    }
    if (
      !model.fields.every(
        (f) =>
          r.features[f.id] === null || f.options.includes(r.features[f.id]),
      )
    )
      return false;
    if (r.begin !== null && r.begin !== undefined && !Number.isFinite(r.begin))
      return false;
    if (r.end !== null && r.end !== undefined && !Number.isFinite(r.end))
      return false;
    if (Number.isFinite(r.begin) && Number.isFinite(r.end) && r.begin > r.end)
      return false;
    return (
      role(r) !== "sample" ||
      (model.inScope(r) &&
        r.period === "Hellenistik" &&
        r.identityConfidence !== "Tartışmalı")
    );
  }
  function validDataset(data) {
    return (
      data?.schemaVersion === 1 &&
      Array.isArray(data.records) &&
      data.records.length >= 2 &&
      data.records.every(validateCatalogRecord) &&
      new Set(data.records.map((r) => r.id)).size === data.records.length
    );
  }
  function sampleSummary(records) {
    const selected = records.filter(eligible);
    const apollon = selected.filter((r) => r.subject === "Apollon").length,
      afrodit = selected.filter((r) => r.subject === "Afrodit").length;
    return {
      total: selected.length,
      apollon,
      afrodit,
      targetReached:
        selected.length >= 10 &&
        selected.length <= 15 &&
        apollon >= 5 &&
        apollon <= 8 &&
        afrodit >= 5 &&
        afrodit <= 8,
      references: records.filter((r) => role(r) === "reference").length,
      candidates: records.filter((r) => role(r) === "candidate").length,
    };
  }
  function groupPairs(records, mode = "all") {
    const sample = records.filter(eligible),
      pairs = [];
    for (let i = 0; i < sample.length; i++)
      for (let j = i + 1; j < sample.length; j++) {
        const a = sample[i],
          b = sample[j],
          group =
            a.subject === b.subject
              ? a.subject === "Apollon"
                ? "apollo"
                : "aphrodite"
              : "cross";
        if (mode !== "all" && mode !== group) continue;
        const result = model.compare(a, b);
        pairs.push({
          first: a.id,
          second: b.id,
          firstTitle: a.title,
          secondTitle: b.title,
          group,
          ...result,
        });
      }
    return pairs.sort(
      (a, b) =>
        (b.score ?? -1) - (a.score ?? -1) ||
        a.first.localeCompare(b.first) ||
        a.second.localeCompare(b.second),
    );
  }
  function comparisonEligible(record) {
    return (
      model.inScope(record) &&
      record.identityConfidence !== "Tartışmalı"
    );
  }
  function comparisonPairs(records, mode = "all") {
    const comparable = records.filter(comparisonEligible),
      pairs = [];
    for (let i = 0; i < comparable.length; i++)
      for (let j = i + 1; j < comparable.length; j++) {
        const a = comparable[i],
          b = comparable[j],
          group =
            a.subject === b.subject
              ? a.subject === "Apollon"
                ? "apollo"
                : "aphrodite"
              : "cross";
        if (mode !== "all" && mode !== group) continue;
        const result = model.compare(a, b);
        pairs.push({
          first: a.id,
          second: b.id,
          firstTitle: a.title,
          secondTitle: b.title,
          group,
          ...result,
        });
      }
    return pairs.sort(
      (a, b) =>
        (b.score ?? -1) - (a.score ?? -1) ||
        a.first.localeCompare(b.first) ||
        a.second.localeCompare(b.second),
    );
  }
  function codingComparable(a, b) {
    return (
      a.subject === b.subject &&
      a.begin === b.begin &&
      a.end === b.end &&
      a.source === b.source &&
      role(a) === role(b)
    );
  }
  function agreement(first, second) {
    const sample = first.filter(eligible),
      other = new Map(second.map((r) => [r.id, r]));
    const pairs = sample
      .map((a) => [a, other.get(a.id)])
      .filter(
        ([a, b]) =>
          b &&
          eligible(b) &&
          codingComparable(a, b) &&
          typeof a.coder === "string" &&
          typeof b.coder === "string" &&
          a.coder.trim() &&
          b.coder.trim() &&
          a.coder.trim().toLocaleLowerCase("tr") !==
            b.coder.trim().toLocaleLowerCase("tr"),
      );
    const fields = model.fields.map((f) => {
      const values = pairs
        .map(([a, b]) => ({
          id: a.id,
          title: a.title,
          a: a.features[f.id],
          b: b.features[f.id],
        }))
        .filter(
          (r) =>
            r.a !== null &&
            r.a !== undefined &&
            r.b !== null &&
            r.b !== undefined,
        );
      const n = values.length,
        matches = values.filter((r) => r.a === r.b).length,
        one = new Map(),
        two = new Map();
      for (const v of values) {
        one.set(v.a, (one.get(v.a) || 0) + 1);
        two.set(v.b, (two.get(v.b) || 0) + 1);
      }
      const po = n ? matches / n : null,
        pe = n
          ? [...one].reduce(
              (sum, [key, count]) =>
                sum + (count / n) * ((two.get(key) || 0) / n),
              0,
            )
          : null;
      const kappa =
        n >= 2 && pe !== null && pe < 1 ? (po - pe) / (1 - pe) : null;
      return {
        id: f.id,
        label: f.label,
        n,
        agreement: po === null ? null : po * 100,
        kappa,
        excluded: sample.length - n,
        disagreements: values.filter((r) => r.a !== r.b),
      };
    });
    return { matchedRecords: pairs.length, fields };
  }
  // Tam veri kimliği saklanır; değişiklikte uzman karşılaştırması geçersiz sayılır.
  function fingerprint(records) {
    const text = JSON.stringify({
      rule: "equal-categorical-v1:min3",
      fields: model.fields,
      sample: records
        .filter(eligible)
        .map((r) => ({
          id: r.id,
          subject: r.subject,
          begin: r.begin,
          end: r.end,
          source: r.source,
          features: Object.fromEntries(
            model.fields.map((f) => [f.id, r.features[f.id] ?? null]),
          ),
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    });
    // Sürüm özeti; kriptografik imza veya bağımsızlık kanıtı değildir.
    let a = 2166136261,
      b = 2654435769;
    for (let i = 0; i < text.length; i++) {
      a = Math.imul(a ^ text.charCodeAt(i), 16777619);
      b = Math.imul(b ^ text.charCodeAt(i), 2246822519);
    }
    return (
      "catalog-v1-" +
      (a >>> 0).toString(16).padStart(8, "0") +
      (b >>> 0).toString(16).padStart(8, "0")
    );
  }
  function expertTemplate(records, referenceId) {
    return {
      schemaVersion: 1,
      expertName: "",
      recordedAt: "",
      independent: false,
      referenceId,
      datasetFingerprint: fingerprint(records),
      rankedIds: [],
      note: "",
      instructions:
        "Model sıralaması görülmeden hazırlanmış bağımsız uzman sıralaması. rankedIds: referans dışındaki örneklem eser kimlikleri, en benzeyenden en az benzeyene. Eşit uzman sıraları bu sürümde desteklenmez; zorunlu eşitlik varsa ayrı nitel rapor kullanın.",
      catalog: records
        .filter(eligible)
        .map((r) => ({ id: r.id, title: r.title })),
    };
  }
  function validExpert(data, records) {
    const sample = records.filter(eligible),
      peerIds = sample
        .filter((r) => r.id !== data?.referenceId)
        .map((r) => r.id);
    return (
      data?.schemaVersion === 1 &&
      typeof data.expertName === "string" &&
      !!data.expertName.trim() &&
      data.independent === true &&
      typeof data.note === "string" &&
      !!data.note.trim() &&
      typeof data.recordedAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T/.test(data.recordedAt) &&
      Number.isFinite(Date.parse(data.recordedAt)) &&
      Date.parse(data.recordedAt) <= Date.now() &&
      sample.some((r) => r.id === data.referenceId) &&
      peerIds.length > 0 &&
      Array.isArray(data.rankedIds) &&
      data.rankedIds.length === peerIds.length &&
      new Set(data.rankedIds).size === peerIds.length &&
      data.rankedIds.every((id) => peerIds.includes(id)) &&
      data.datasetFingerprint === fingerprint(records)
    );
  }
  function averageRanks(values) {
    return values.map((value) => {
      const less = values.filter((x) => x < value).length,
        equal = values.filter((x) => x === value).length;
      return less + (equal + 1) / 2;
    });
  }
  function correlation(x, y) {
    if (x.length < 2) return null;
    const mx = x.reduce((s, v) => s + v, 0) / x.length,
      my = y.reduce((s, v) => s + v, 0) / y.length;
    let xx = 0,
      yy = 0,
      xy = 0;
    for (let i = 0; i < x.length; i++) {
      xx += (x[i] - mx) ** 2;
      yy += (y[i] - my) ** 2;
      xy += (x[i] - mx) * (y[i] - my);
    }
    return xx > 0 && yy > 0 ? xy / Math.sqrt(xx * yy) : null;
  }
  function expertComparison(records, data) {
    if (!validExpert(data, records))
      return { valid: false, rows: [], rho: null, count: 0 };
    const sample = records.filter(eligible),
      reference = sample.find((r) => r.id === data.referenceId);
    const evaluated = data.rankedIds.map((id, index) => {
      const r = sample.find((s) => s.id === id),
        result = model.compare(reference, r);
      return {
        id,
        title: r.title,
        expertRank: index + 1,
        score: result.score,
        coverage: result.coverage,
      };
    });
    const comparable = evaluated.filter((r) => r.score !== null),
      modelRanks = averageRanks(comparable.map((r) => -r.score)),
      expertRanks = averageRanks(comparable.map((r) => r.expertRank));
    const rows = evaluated.map((r) => ({
      ...r,
      modelRank:
        r.score === null
          ? null
          : modelRanks[comparable.findIndex((c) => c.id === r.id)],
    }));
    return {
      valid: true,
      rows,
      rho: correlation(expertRanks, modelRanks),
      count: comparable.length,
    };
  }
  const api = {
    roles,
    MINIMUM_FIELDS,
    role,
    eligible,
    validateCatalogRecord,
    validDataset,
    sampleSummary,
    groupPairs,
    comparisonEligible,
    comparisonPairs,
    agreement,
    fingerprint,
    expertTemplate,
    validExpert,
    expertComparison,
    averageRanks,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HellenisticProtocol = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
