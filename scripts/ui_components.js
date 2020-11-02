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
  }
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
  }
  update_statements() {
    this.statements = this.store.querySync(
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
  registerComponentClass(namedNode, classRef) {
    this.registeredComponentClasses[$rdf.termValue(namedNode)] = classRef;
  }
  registerComponent(instanceRef) {
    return this.components.push(instanceRef) - 1;
  }
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
  render() {
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
  }
  render() {
    if (this.subgroups.length == 0) return "\n";
    let predicate = this.page.label(this.predicate);
    var innerHTML = `\n\n<li><span class=predicate>${predicate}</span>\n<ul>\n\n`;
    let comp = this;
    this.subgroups.forEach(function (s, i) {
      let object = comp.page.label(s.object);
      innerHTML +=
        `<li><span title='${s.documentName}: ${s.text}'><a href='${s.link}' target='_new'>${object}</a></li>` +
        comp.blocks[i].render() +
        "</li>\n";
    });
    innerHTML += "</ul></li>\n";
    return innerHTML;
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
  }
  handlePredicate(p) {
    let component = this.page.store.any(p, VOC("defaultDisplayComponent"), null)
      .value;
    let componentClass = this.page.registeredComponentClasses[component];
    //TODO: get label for each predicate
    return new componentClass(this.page, this.subject, $rdf.termValue(p));
  }
  render() {
    if (this.nstatements == 0) return "\n";
    var innerHTML = "<div class=subject_block><ul>\n";
    this.blocks.forEach(b => (innerHTML += b.render()));
    innerHTML += "</ul></div>\n";
    return innerHTML;
  }
}
