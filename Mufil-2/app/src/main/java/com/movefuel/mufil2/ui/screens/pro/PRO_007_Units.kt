package com.movefuel.mufil2.ui.screens.pro

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRO007UnitsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRO_007",
        title = "Units",
        subtitle = "Profile, goals, preferences, privacy, and help.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_008,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRO_006,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Metric","kg · cm · km",true)
            MFOptionCard("Imperial","lb · ft/in · mi")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRO007UnitsScreenPreview() {
    MoveFuelTheme { PRO007UnitsScreen {} }
}
