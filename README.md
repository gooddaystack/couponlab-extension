# CouponLab

The browser extension lists live coupon codes from CouponLab. Click the icon, pick a shop, copy a code.

Install it from a store. Do not treat this repository as the download.

- [Chrome Web Store](https://chromewebstore.google.com/detail/couponlab/fmkenekppideckddmkgoagkcmdpmamca)
- [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/bkjmldepcinpajegmfddalaodacocnig)
- Site: [couponlab.com](https://www.couponlab.com)
- Privacy: [couponlab.com/privacy](https://www.couponlab.com/privacy)

## What it does

Version 1.4.0 opens a popup. The shop list is already in the page, so it does not wait on the network. A packed catalog sits in `data/`. A live refresh from couponlab.com stops after 2.5 seconds.

It reads the current tab URL only after you click the icon. It does not scrape a checkout page, and it does not type a code in for you.

## What stays on your machine

The packed shop list and codes ship with the extension. A live refresh asks couponlab.com for JSON, not a script. There is no account in the extension.

The live policy is [couponlab.com/privacy](https://www.couponlab.com/privacy). A short copy is in [PRIVACY.md](PRIVACY.md).

## This repository

This is the public note for 1.4.0: the manifest, the popup, the icons, and the packed catalog. The website source stays in a separate private repository. There is no installable zip here.
