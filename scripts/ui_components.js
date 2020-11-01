const VOC = new $rdf.Namespace("http://example.com/vocab/");

class Page {
  constructor(page_content) {
    this.registeredComponents = {};
    this.store = $rdf.graph();
    this.page_uri = $rdf.sym("http://example.com/conceptualisation"); // TODO
    this.page_object = $rdf.sym("http://example.com/conceptualisation#this"); // TODO
    $rdf.parse(page_content, this.store, this.page_uri.value);
    this.title = this.store.any(this.page_object, VOC("title"), null).value;
    this.target_subject = this.store.any(
      this.page_object,
      VOC("target_subject"),
      null
    ).value;
  }
  registerComponent(namedNode, classRef) {
    this.registeredComponents[namedNode.value] = classRef;
  }
}

class PredicateUL {
  constructor(page, subject, predicate) {
    this.wanted_statements = page.statements.filter(
      s => (s.subject == subject) & (s.predicate == predicate)
    );
    this.subject = subject;
    this.predicate = predicate;
  }
  render() {
    if (this.wanted_statements.length == 0) return "\n";
    var innerHTML = `\n\n<li><span class=predicate>${this.predicate}</span>\n<ul>\n\n`;
    this.wanted_statements.forEach(
      s =>
        (innerHTML += `<li title='${s.documentName}: ${s.text}'><a href='${s.link}' target='_new'>${s.object}</a></li>`)
    );
    innerHTML += "</ul></li>\n";
    return innerHTML;
  }
}
class HTMLANDFILTERSUBGROUP {
  constructor(page, subject, predicate) {
    this.subject = $rdf.termValue(subject);
    this.predicate = $rdf.termValue(predicate);
    this.subgroups = page.statements.filter(
      s => (s.subject == this.subject) & (s.predicate == this.predicate)
    );
    this.blocks = this.subgroups.map(
      s =>
        new SubjectBlock(
          page,
          typeof s.object == "string" ? s.object : s.object["@id"]
        )
    );
  }
  render() {
    if (this.subgroups.length == 0) return "\n";
    var innerHTML = `\n\n<li><span class=predicate>${this.predicate}</span>\n<ul>\n\n`;
    this.subgroups.forEach(
      (s, i) =>
        (innerHTML +=
          `<li><span title='${s.documentName}: ${s.text}'><a href='${
            s.link
          }' target='_new'>${
            typeof s.object == "string" ? s.object : s.object["@id"]
          }</a></li>` + this.blocks[i].render()) + "</li>\n"
    );
    innerHTML += "</ul></li>\n";
    return innerHTML;
  }
}

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
    let componentClass = this.page.registeredComponents[component];
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
