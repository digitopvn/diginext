Here are the frequently asked questions about **Diginext (DX)** and antd that you should look up before you ask in the community or create a new issue. We also maintain a [FAQ issues label](http://diginext.site/faq) for common github issues.

---

## Can I use internal API which is not documented on the site?

NOT RECOMMEND. Internal API is not guaranteed to be compatible with future versions. It may be removed or changed in some versions. If you really need to use it, you should to make sure these API is still valid when upgrading to a new version or just lock version for usage.

## Why API request should be strict discussion?

We are cautious when adding APIs because some APIs may not be abstract enough to become historical debt. For example, when there is a need to change the way of interaction, these poor abstractions may cause breaking changes. To avoid such problems, we recommend that new features be implemented through HOCs first.

## How to avoid breaking change when update version?

antd will avoid breaking change in minor & patch version. You can safe do follow things:

- Official demo usage
- FAQ suggestion. Including codesandbox sample, marked as FAQ issue

And which you should avoid to do:

- Bug as feature. It will break in any other case (e.g. Use div as Tabs children)
- Use magic code to realize requirement but which can be realized with normal API

## How to spell Diginext (DX) correctly?

- ✅ **Diginext**: Capitalized first character, for the identification name.
- ✅ **DX** or **dx**: for the CLI name, and the top priority mission of it - `Developer Experience`.

Here are some typical wrong examples:

- ❌ DigiNext
- ❌ Digi Next
- ❌ digi next
- ❌ DigiX
- ❌ next cli
- ❌ dx cli

## Do you guys have any channel or website for submitting monetary donations, like through PayPal or Alipay?

This is a **ONE-MAN** project & I've been spending a lot of time for it, although it's my hobby project, I still need beers to keep the momentum.
If you enjoyed this project — or just feeling generous, consider buying me some beers. Cheers! 🍻

<a href="https://www.buymeacoffee.com/duynguyen" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-green.png" alt="Buy Me A Coffee" height=48 ></a>

<a href="https://paypal.me/mrgoonie/" target="_blank"><img src="https://github.com/andreostrovsky/donate-with-paypal/blob/master/blue.svg" height=48></a>

<a href="https://opencollective.com/diginext/donate" target="_blank">
  <img src="https://opencollective.com/diginext/donate/button@2x.png?color=blue" height=48 />
</a>

<a href="https://me.momo.vn/mrgoonie" target="_blank">
  <img src="https://github.com/digitopvn/diginext/blob/main/docs/momo-button.png" height=48 />
</a>

Thank you!