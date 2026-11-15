/* Kaynak şemaları: https://metmuseum.github.io/ ve https://openaccess-api.clevelandart.org/ */
(function (root) {
  const model =
    typeof module !== "undefined" && module.exports
      ? require("./research-model")
      : root.HellenisticModel;
  function subjectMatch(title, term) {
    return (term === "Apollo" ? /\bApollo\b/i : /\bAphrodite\b/i).test(
      String(title || ""),
    );
  }
  function sculpture(text) {
    return /sculpture|statue|statuette|head|torso|bust/i.test(
      String(text || ""),
    );
  }
  function scoped(term, begin, end) {
    return model.inScope({
      subject: term === "Apollo" ? "Apollon" : "Afrodit",
      begin,
      end,
    });
  }
  function normalizeMet(r, term) {
    if (
      !r ||
      !r.isPublicDomain ||
      !subjectMatch(r.title, term) ||
      !sculpture(r.objectName + " " + r.title) ||
      /roman|copy|after an original/i.test(
        [r.period, r.title, r.objectDate].join(" "),
      ) ||
      !scoped(term, r.objectBeginDate, r.objectEndDate)
    )
      return null;
    return {
      key: "met-" + r.objectID,
      source: "Met",
      title: r.title,
      date: r.objectDate,
      inventory: r.accessionNumber || "",
      license: "CC0",
      image: r.primaryImageSmall || null,
      url:
        "https://www.metmuseum.org/art/collection/search/" +
        encodeURIComponent(r.objectID),
    };
  }
  function normalizeCleveland(r, term) {
    if (
      !r ||
      r.share_license_status !== "CC0" ||
      !subjectMatch(r.title, term) ||
      !sculpture(r.type) ||
      /roman/i.test((r.culture || []).join(" ")) ||
      /roman|copy|after an original/i.test(
        [r.title, r.creation_date].join(" "),
      ) ||
      /roman copy|copy of a|copy after/i.test(r.description || "") ||
      !scoped(term, r.creation_date_earliest, r.creation_date_latest)
    )
      return null;
    return {
      key: "cleveland-" + r.id,
      source: "Cleveland",
      title: r.title,
      date: r.creation_date,
      inventory: r.accession_number || "",
      license: "CC0",
      image: r.images?.web?.url || null,
      url:
        "https://www.clevelandart.org/art/" +
        encodeURIComponent(r.accession_number || r.id),
    };
  }
  async function collectMet(term, request) {
    const search = await request(
      "https://collectionapi.metmuseum.org/public/collection/v1.1/search?title=true&hasImages=true&dateBegin=-323&dateEnd=-31&limit=12&q=" +
        encodeURIComponent(term),
    );
    const details = await Promise.allSettled(
      (search.objectIDs || [])
        .slice(0, 12)
        .map((id) =>
          request(
            "https://collectionapi.metmuseum.org/public/collection/v1/objects/" +
              id,
          ),
        ),
    );
    return {
      source: "Met",
      term,
      failed: details.filter((r) => r.status === "rejected").length,
      records: details
        .filter((r) => r.status === "fulfilled")
        .map((r) => normalizeMet(r.value, term))
        .filter(Boolean),
    };
  }
  async function collectCleveland(term, request) {
    const fields =
      "id,accession_number,title,creation_date,creation_date_earliest,creation_date_latest,culture,type,share_license_status,images,description";
    const result = await request(
      "https://openaccess-api.clevelandart.org/api/artworks/?q=" +
        encodeURIComponent(term) +
        "&cc0&has_image=1&type=Sculpture&created_after=-324&created_before=-30&limit=30&fields=" +
        encodeURIComponent(fields),
    );
    return {
      source: "Cleveland",
      term,
      failed: 0,
      records: (result.data || [])
        .map((r) => normalizeCleveland(r, term))
        .filter(Boolean),
    };
  }
  async function discover(request) {
    const jobs = [
      ...["Apollo", "Aphrodite"].map((term) => ({
        source: "Met",
        term,
        run: () => collectMet(term, request),
      })),
      ...["Apollo", "Aphrodite"].map((term) => ({
        source: "Cleveland",
        term,
        run: () => collectCleveland(term, request),
      })),
    ];
    const results = await Promise.allSettled(jobs.map((j) => j.run()));
    const reports = results.map((r, i) =>
      r.status === "fulfilled"
        ? {
            source: jobs[i].source,
            term: jobs[i].term,
            count: r.value.records.length,
            failed: r.value.failed,
            error: null,
          }
        : {
            source: jobs[i].source,
            term: jobs[i].term,
            count: 0,
            failed: 1,
            error: r.reason?.message || "Bağlantı hatası",
          },
    );
    const records = [
      ...new Map(
        results
          .filter((r) => r.status === "fulfilled")
          .flatMap((r) => r.value.records)
          .map((r) => [r.key, r]),
      ).values(),
    ];
    return { records, reports };
  }
  const api = { normalizeMet, normalizeCleveland, collectCleveland, discover };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HellenisticMuseums = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
