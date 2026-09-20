package com.movefuel.mufil2.ui.screens.sor

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SOR003BackBodyMapScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SOR_003",
        title = "Back Body Map",
        subtitle = "Soreness body-map workflow; pain stays separate.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SOR_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SOR_002,
        onNavigate = onNavigate,
    ) {
            MFBodyMapPlaceholder(false)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SOR003BackBodyMapScreenPreview() {
    MoveFuelTheme { SOR003BackBodyMapScreen {} }
}
