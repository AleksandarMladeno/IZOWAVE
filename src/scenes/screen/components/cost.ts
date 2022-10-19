import { INTERFACE_TEXT_COLOR, INTERFACE_FONT, RESOURCE_COLOR } from '~const/interface';
import { Component } from '~lib/ui';
import { Resources, ResourceType } from '~type/world/resources';

type Props = {
  label: string
  need: () => Resources
  have: () => Resources
};

export const ComponentCost = Component<Props>(function (container, {
  label, need, have,
}) {
  /**
   * Body
   */

  const body = this.add.rectangle(0, 0, 0, 0, 0x000000, 0.9);

  body.setOrigin(0.0, 0.0);
  body.adaptive = () => {
    body.setSize(container.width, container.height);
  };

  container.add(body);

  /**
   * Title
   */

  const title = this.add.text(0, 0, label, {
    resolution: window.devicePixelRatio,
    fontFamily: INTERFACE_FONT.MONOSPACE,
  });

  title.adaptive = () => {
    const fontSize = container.width / 100;
    const offset = container.width * 0.15;

    title.setFontSize(`${fontSize}rem`);
    title.setPosition(offset, offset);
  };

  container.add(title);

  /**
   * Items
   */

  const list = this.add.container();

  list.adaptive = () => {
    const offset = container.width * 0.15;

    list.setSize(container.width - (offset * 2), 0);
    list.setPosition(offset, title.y + title.height + offset);
  };

  container.add(list);

  Object.values(ResourceType).forEach((type, index) => {
    /**
     * Wrapper
     */

    const wrapper = this.add.container();

    wrapper.adaptive = () => {
      const offsetY = list.width * 0.15;
      const height = list.width * 0.23;

      wrapper.setSize(list.width, height);
      wrapper.setPosition(0, (height + offsetY) * index);
    };

    list.add(wrapper);

    /**
     * Icon
     */

    const icon = this.add.rectangle(0, 0, 0, 0, RESOURCE_COLOR[type]);

    icon.setOrigin(0.0, 0.0);
    icon.adaptive = () => {
      icon.setSize(wrapper.height, wrapper.height);
    };

    wrapper.add(icon);

    /**
     * Amount
     */

    const amount = this.add.text(0, 0, '', {
      resolution: window.devicePixelRatio,
      fontFamily: INTERFACE_FONT.MONOSPACE,
    });

    amount.setName('Amount');
    amount.setOrigin(0.0, 0.5);
    amount.adaptive = () => {
      const fontSize = wrapper.width / 54;
      const offsetX = wrapper.width * 0.15;

      amount.setFontSize(`${fontSize}rem`);
      amount.setPosition(icon.width + offsetX, wrapper.height / 2);
    };

    wrapper.add(amount);
  });

  return {
    update: () => {
      if (!container.visible) {
        return;
      }

      body.height = container.height;

      const needAmounts = need();

      if (!needAmounts) {
        return;
      }

      const haveAmounts = have();

      Object.values(ResourceType).forEach((type, index) => {
        const wrapper = <Phaser.GameObjects.Container> list.getAt(index);
        const amount = <Phaser.GameObjects.Text> wrapper.getByName('Amount');
        const haveAmount = haveAmounts[type] || 0;
        const needAmount = needAmounts[type] || 0;

        amount.setText(String(needAmount));
        if (needAmount === 0) {
          amount.setColor('#aaa');
        } else if (haveAmount < needAmount) {
          amount.setColor(INTERFACE_TEXT_COLOR.ERROR);
        } else {
          amount.setColor('#fff');
        }
      });
    },
  };
});
