const {
	withMainActivity,
	withAndroidManifest,
	AndroidConfig,
} = require("@expo/config-plugins")
const {
	mergeContents,
} = require("@expo/config-plugins/build/utils/generateCode")

const DELEGATE_IMPORT =
	"import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate"
const DELEGATE_CALL =
	"    HealthConnectPermissionDelegate.setPermissionDelegate(this)"

function addDelegateImport(src) {
	if (src.includes(DELEGATE_IMPORT)) return src
	return src.replace(/(^package .*$)/m, `$1\n\n${DELEGATE_IMPORT}`)
}

function addDelegateCall(src) {
	if (src.includes("HealthConnectPermissionDelegate.setPermissionDelegate")) {
		return src
	}
	return mergeContents({
		src,
		anchor: /super\.onCreate\([^)]*\)/,
		offset: 1,
		comment: "//",
		tag: "health-connect-delegate",
		newSrc: DELEGATE_CALL,
	}).contents
}

const withHealthConnectDelegate = (config) =>
	withMainActivity(config, (cfg) => {
		if (cfg.modResults.language !== "kt") {
			throw new Error(
				`withHealthConnect: expected MainActivity in Kotlin, got ${cfg.modResults.language}`,
			)
		}
		let src = cfg.modResults.contents
		src = addDelegateImport(src)
		src = addDelegateCall(src)
		cfg.modResults.contents = src
		return cfg
	})

const ALIAS_NAME = "ViewPermissionUsageActivity"

const withHealthPermissionUsageAlias = (config) =>
	withAndroidManifest(config, (cfg) => {
		const app = AndroidConfig.Manifest.getMainApplicationOrThrow(
			cfg.modResults,
		)
		app["activity-alias"] = app["activity-alias"] || []
		const exists = app["activity-alias"].some(
			(a) => a.$ && a.$["android:name"] === ALIAS_NAME,
		)
		if (!exists) {
			app["activity-alias"].push({
				$: {
					"android:name": ALIAS_NAME,
					"android:exported": "true",
					"android:targetActivity": ".MainActivity",
					"android:permission":
						"android.permission.START_VIEW_PERMISSION_USAGE",
				},
				"intent-filter": [
					{
						action: [
							{
								$: {
									"android:name":
										"android.intent.action.VIEW_PERMISSION_USAGE",
								},
							},
						],
						category: [
							{
								$: {
									"android:name":
										"android.intent.category.HEALTH_PERMISSIONS",
								},
							},
						],
					},
				],
			})
		}
		return cfg
	})

module.exports = function withHealthConnect(config) {
	config = withHealthConnectDelegate(config)
	config = withHealthPermissionUsageAlias(config)
	return config
}
