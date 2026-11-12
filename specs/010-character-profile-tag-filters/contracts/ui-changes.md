# UI Contract: Character Profile and Tag Filters

## Character Profile

- When present, sections appear in this order: Personality, Physical Description, Relationships.
- Empty description values omit their corresponding section.
- Personality and Physical Description remain visible, preserve paragraph boundaries, and use readable text width and paragraph spacing consistent with story bodies.
- Description content remains escaped plain text. The descriptions are not expandable/collapsible controls.

## Character Listing Filters

- Tag selection and deselection in the filter controls immediately submit the existing GET form when JavaScript is available.
- The submission includes the current gender and all selected tags; other active filters are not discarded.
- The resulting URL encodes the applied filter state so it can be reloaded and shared.
- Without JavaScript, the existing Apply filters submit button provides the same filtering behavior.
- Tag controls remain native keyboard-operable inputs with visible focus treatment.
- Clicking tags displayed on character cards is not part of this interaction.
