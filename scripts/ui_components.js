const VOC = new $rdf.Namespace(
  "https://josephguillaume.solidcommunity.net/public/id_cards/vocab.ttl#"
);
voc_uri = x =>
  `<https://josephguillaume.solidcommunity.net/public/id_cards/vocab.ttl#${x}>`;

/**
 * Base class containing Linked Data to be displayed and registered UI components
 */
class Page {
  constructor(rdf_uri) {
    this.registeredComponentClasses = {};
    this.components = [];
    this.store = $rdf.graph();
    this.fetcher = new $rdf.Fetcher(this.store);
    // Internal array representation of data to be displayed
    this.statements = [];
    // Store for statements from additional sources
    this.external_data = {};
  }
  /**
   * Load data defining the page UI and data to be used
   * Updates RDF store, array representation of statements,
   *   creates root component, and calls render
   * @param {URI for RDF data readable by rdflib.js} rdf_uri
   */
  async load_page(rdf_uri) {
    await this.fetcher.load(rdf_uri);

    this.page_uri = $rdf.sym(rdf_uri);
    this.page_object = $rdf.sym(rdf_uri + "#this");
    this.title = this.store.any(this.page_object, VOC("title"), null).value;
    this.target_subject = this.store.any(
      this.page_object,
      VOC("target_subject"),
      null
    ).value;

    this.update_statements();
    // TODO: identify root component from provided linked data
    // TODO: optionally allow switching between root components
    this.root = new SubjectBlock(this, this.target_subject);
    this.render();
  }
  update_statements() {
    this.statements = this.store.querySync(
      // TODO: subset by graph?
      $rdf.SPARQLToQuery(
        `select ?text ?position ?link ?annotation ?subject ?predicate ?object WHERE {
          ?st ${voc_uri("text")} ?text.
          ?st ${voc_uri("position")} ?position.
          ?st ${voc_uri("link")} ?link.
          ?st ${voc_uri("annotation")} ?annotation.
          ?st ${voc_uri("subject")} ?subject. 
          ?st ${voc_uri("predicate")} ?predicate . 
          ?st ${voc_uri("object")} ?object.
    }`,
        true,
        this.store
      )
    );
    this.statements = this.statements.map(s => ({
      text: $rdf.termValue(s["?text"]),
      position: Number($rdf.termValue(s["?position"])),
      link: $rdf.termValue(s["?link"]),
      annotation: $rdf.termValue(s["?annotation"]),
      subject: $rdf.termValue(s["?subject"]),
      predicate: $rdf.termValue(s["?predicate"]),
      object: $rdf.termValue(s["?object"]),
      object_type: s["?object"].termType
    }));
    this.statements.sort(function (a, b) {
      return a.position - b.position;
    });
  }
  load_external_data(rdf_uri) {
    // TODO: load rdf into store and then convert
    // TODO: allow loading other types of data with appropriate registered conversions
    this.external_data[rdf_uri] = [
      {
        text: "",
        position: null,
        link: "",
        annotation: "",
        subject:
          "https://josephguillaume.solidcommunity.net/public/id_cards/conceptualisation.ttl#system_conceptualisation_tools",
        predicate:
          "https://josephguillaume.solidcommunity.net/public/id_cards/vocab.ttl#reference",
        object: "New reference",
        object_type: "Literal"
      }
    ];
    // TODO: indicate in UI that external data is available
  }
  displayed_statements() {
    // TODO: can this be done in rdf terms instead?
    return this.root.displayed_statements();
  }
  /**
   * Render the page by calling render on root component.
   * @param {Boolean indicating whether to ask UIs to compare with external data source
   * specified by `this.external_identifier`.
   * Usually invokved by calling `page.compare(identifier)`} compare
   */
  render(compare) {
    // TODO: allow root element to be specified
    document.getElementById("root").innerHTML =
      this.title + this.root.render(compare);
  }
  compare(identifier) {
    this.external_identifier = identifier;
    this.render(true);
  }
  /**
   * Register a JS class to be used when data requests a UI component by URI
   * @param {URI or RDF namedNode defining a component class} namedNode
   * @param {Reference to a JS class to be used for data requesting that URI} classRef
   */
  registerComponentClass(namedNode, classRef) {
    this.registeredComponentClasses[$rdf.termValue(namedNode)] = classRef;
  }
  /**
   * Register an instantiated component for reuse
   * Required by show_settings
   * Usually called by component constructor.
   * Component can be accessed using `page.components[id]`
   * @param {Reference to JS object providing a UI component} instanceRef
   * @returns {id of component (numeric)}
   */
  registerComponent(instanceRef) {
    if (this.components.includes(instanceRef))
      stop("Component is already registered");
    return this.components.push(instanceRef) - 1;
  }
  /**
   * Show a dialog for settings for a UI component
   * @param {Component id, obtained using registerComponent} id
   * @param {Any options required by the UI component (see corresponding component class)} options
   */
  show_settings(id, options) {
    let component = this.components[id];
    if (component) component.show_settings(options);
  }
  label(subject) {
    try {
      let st = this.store.any(
        $rdf.sym(subject),
        $rdf.sym("http://www.w3.org/2000/01/rdf-schema#label"),
        null
      );
      return st ? st : subject.replaceAll("_", " ").replace(/.*#/, "");
    } catch (error) {
      return subject;
    }
  }
}

/**
 * UI component listing objects for a given subject and predicate
 * The `link` to an annotation and its original `text` are also included
 * rdfs:label is used for IRIs
 */
class ObjectList {
  constructor(page, subject, predicate) {
    this.page = page;
    this.wanted_statements = page.statements.filter(
      s => (s.subject == subject) & (s.predicate == predicate)
    );
    this.subject = subject;
    this.predicate = predicate;
    this.component_id = page.registerComponent(this);
  }
  render(compare) {
    if (compare) return this.compare();
    if (this.wanted_statements.length == 0) return "\n";
    let predicate = this.page.label(this.predicate);
    var innerHTML = `\n\n<li><span class=predicate>${predicate}</span>\n<ul>\n\n`;
    let comp = this;
    this.wanted_statements.forEach(function (s, i) {
      let object = comp.page.label(s.object);
      innerHTML += `<li title='${s.documentName}: ${s.text}'><a onClick='page.show_settings(${comp.component_id},${i})'>${object}</a></li>`;
    });
    innerHTML += "</ul></li>\n";
    return innerHTML;
  }
  compare() {
    //TODO: in this case, render could be a special case of compare with a null identifier?
    this.comparison_statements = page.external_data[
      page.external_identifier
    ].filter(
      s => (s.subject == this.subject) & (s.predicate == this.predicate)
    );
    // TODO: filter statements
    if (
      this.wanted_statements.length == 0 &&
      this.comparison_statements.length == 0
    )
      return "\n";
    let predicate = this.page.label(this.predicate);
    var innerHTML = `\n\n<li><span class=predicate>${predicate}</span>\n<ul>\n\n`;
    let comp = this;
    this.wanted_statements.forEach(function (s, i) {
      let object = comp.page.label(s.object);
      innerHTML += `<li title='${s.documentName}: ${s.text}'><a onClick='page.show_settings(${comp.component_id},${i})'>${object}</a></li>`;
    });
    this.comparison_statements.forEach(function (s, i) {
      let object = comp.page.label(s.object);
      // TODO: separate settings for comparison statements
      innerHTML += `<li title='${s.documentName}: ${s.text}'><a style="color: red;">${object}</a></li>`;
    });
    innerHTML += "</ul></li>\n";
    return innerHTML;
  }
  show_settings(options) {
    let $el = document.getElementById("ObjectListSettings");
    if ($el === null) {
      let div = document.createElement("div");
      div.id = "ObjectListSettings";
      $el = document.body.appendChild(div);
    }
    let s = this.wanted_statements[options];
    $el.innerHTML = `Annotation: <a href='${s.link}' target='_new'>${s.link}</a>`;
  }
  displayed_statements() {
    return this.wanted_statements;
  }
}

/**
 * UI Component providing nested `SubjectBlocks` for each object of a given subject and predicate
 * The `link` to an annotation and its original `text` are also included
 * rdfs:label is used for IRIs
 */
class PredicateBlock {
  constructor(page, subject, predicate) {
    this.page = page;
    this.subject = $rdf.termValue(subject);
    this.predicate = $rdf.termValue(predicate);
    this.subgroups = page.statements.filter(
      s => (s.subject == this.subject) & (s.predicate == this.predicate)
    );
    this.blocks = this.subgroups.map(s => new SubjectBlock(page, s.object));
    this.component_id = page.registerComponent(this);
  }
  render(compare) {
    if (this.subgroups.length == 0) return "\n";
    let predicate = this.page.label(this.predicate);
    var innerHTML = `\n\n<li><span class=predicate>${predicate}</span>\n<ul>\n\n`;
    let comp = this;
    this.subgroups.forEach(function (s, i) {
      let object = comp.page.label(s.object);
      innerHTML +=
        `<li><span title='${s.documentName}: ${s.text}'><a href='${s.link}' target='_new'>${object}</a></li>` +
        comp.blocks[i].render(compare) +
        "</li>\n";
    });
    innerHTML += "</ul></li>\n";
    return innerHTML;
  }
  displayed_statements() {
    return [
      ...this.subgroups,
      ...this.blocks.flatMap(x => x.displayed_statements())
    ];
  }
}

/**
 * UI component for a subject invoking registered UI components for each of a list of predicates
 */
class SubjectBlock {
  constructor(page, subject) {
    this.page = page;
    this.subject = $rdf.termValue(subject);
    const predicates = page.store.match(null, VOC("predicates"), null)[0].object
      .elements;
    this.blocks = predicates.map(p => this.handlePredicate(p));
    this.nstatements = page.statements.filter(
      x =>
        x.subject == this.subject &&
        predicates.map(x => x.value).indexOf(x.predicate) > -1
    ).length;
    this.component_id = page.registerComponent(this);
  }
  handlePredicate(p) {
    let component = this.page.store.any(p, VOC("defaultDisplayComponent"), null)
      .value;
    let componentClass = this.page.registeredComponentClasses[component];
    //TODO: get label for each predicate
    return new componentClass(this.page, this.subject, $rdf.termValue(p));
  }
  render(compare) {
    if (this.nstatements == 0) return "\n";
    var innerHTML = "<div class=subject_block><ul>\n";
    this.blocks.forEach(b => (innerHTML += b.render(compare)));
    innerHTML += "</ul></div>\n";
    return innerHTML;
  }
  displayed_statements() {
    return this.blocks.flatMap(x => x.displayed_statements());
  }
}
