package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO002PersonalDetailsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_002",
        title = "Personal Details",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_003,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_001,
        onNavigate = onNavigate,
    ) {
            MFField("Name","Alex")
            MFField("Date of birth","2000-01-01")
            MFField("Country","Nepal")
            MFField("Timezone","Automatic")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO002PersonalDetailsScreenPreview() {
    MoveFuelTheme { PRO002PersonalDetailsScreen {} }
}
