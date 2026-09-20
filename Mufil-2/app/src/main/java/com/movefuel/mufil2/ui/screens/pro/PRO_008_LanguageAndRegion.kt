package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO008LanguageAndRegionScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_008",
        title = "Language and Region",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_009,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_007,
        onNavigate = onNavigate,
    ) {
            MFField("Language","English")
            MFField("Region","Nepal")
            MFField("Timezone","Automatic")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO008LanguageAndRegionScreenPreview() {
    MoveFuelTheme { PRO008LanguageAndRegionScreen {} }
}
