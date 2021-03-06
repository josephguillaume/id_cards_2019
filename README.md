Experimental generation of an "ID card" for an action (Model conceptualisation)

Flexible semantic annotations of subject, predicate and object on hypothes.is are extracted (saved in hypothesis.rds) and processed to generate a consistent set of triples (out/statements.csv).

Recursive functions are used to display the triples, with information about sub-actions shown as indented text (out/conceptualisation.txt) or html (out/conceptualisation.html), for a specified list of predicates.

A similar ID card generated manually is shown in:

- Zare F, Guillaume JHA, Jakeman AJ (2019) Constructing customized modelling guidelines: a Participatory Integrated Assessment and Modelling example. Modsim2019. https://www.mssanz.org.au/modsim2019/K1/zare.pdf

`index.html` provides a proof of concept web app that reads UI settings and statements to display from RDF (see https://josephguillaume.github.io/id_cards_2019/). Features:

- Display statements in nested UIs. Each component has `render()` function
- Each component is registered: `page.registerComponent()`
- Both UI component and statements are drawn from an RDF document
- Each component has `show_settings()` function
- Labels for URI can be extracted with `page.label(subject)`
- Allow comparison with external data source with `page.compare(identifier)`
- List displayed statements to help identify gaps, with `page.displayed_statements()`
